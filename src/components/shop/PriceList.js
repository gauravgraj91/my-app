import * as React from 'react';
import { DataGrid, GridActionsCellItem, GridToolbarContainer, GridToolbarFilterButton } from '@mui/x-data-grid';
import {
    addPriceListItem,
    subscribeToPriceList,
    updatePriceListItem,
    deletePriceListItem
} from '../../firebase/priceListService';
import {
    Plus,
    Trash2,
    Save,
    X,
    Edit2,
    Search
} from 'lucide-react';
import { format } from 'date-fns';

const PriceList = () => {
    const [rows, setRows] = React.useState([]);
    const [rowModesModel, setRowModesModel] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState("");

    React.useEffect(() => {
        const unsubscribe = subscribeToPriceList((items) => {
            setRows(items);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleRowEditStop = (params, event) => {
        if (params.reason === 'rowFocusOut') {
            event.defaultMuiPrevented = true;
        }
    };

    const handleEditClick = (id) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: 'edit' } });
    };

    const handleSaveClick = (id) => () => {
        setRowModesModel({ ...rowModesModel, [id]: { mode: 'view' } });
    };

    const handleDeleteClick = (id) => async () => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await deletePriceListItem(id);
            } catch (error) {
                console.error("Error deleting item:", error);
                alert("Failed to delete item");
            }
        }
    };

    const handleCancelClick = (id) => () => {
        setRowModesModel({
            ...rowModesModel,
            [id]: { mode: 'view', ignoreModifications: true },
        });

        const editedRow = rows.find((row) => row.id === id);
        if (editedRow.isNew) {
            setRows(rows.filter((row) => row.id !== id));
        }
    };

    const processRowUpdate = async (newRow) => {
        const updatedRow = { ...newRow, isNew: false };
        try {
            if (newRow.isNew) {
                // Remove temporary ID and isNew flag before saving
                const { id, isNew, ...dataToSave } = newRow;
                await addPriceListItem(dataToSave);
                // The subscription will update the rows with the real ID
            } else {
                const { id, ...dataToUpdate } = newRow;
                await updatePriceListItem(id, dataToUpdate);
            }
            return updatedRow;
        } catch (error) {
            console.error("Error saving row:", error);
            alert("Failed to save changes");
            return rows.find(row => row.id === newRow.id); // Revert on error
        }
    };

    const handleRowModesModelChange = (newRowModesModel) => {
        setRowModesModel(newRowModesModel);
    };

    const columns = [
        { field: 'productName', headerName: 'Product Name', width: 200, editable: true },
        {
            field: 'price',
            headerName: 'Price (₹)',
            type: 'number',
            width: 100,
            editable: true,
            valueFormatter: (params) => {
                if (params.value == null) return '';
                return `₹${params.value}`;
            },
        },
        {
            field: 'nettPrice',
            headerName: 'Nett Price (₹)',
            type: 'number',
            width: 120,
            editable: true,
            valueFormatter: (params) => {
                if (params.value == null) return '';
                return `₹${params.value}`;
            },
        },
        {
            field: 'quantityAvailable',
            headerName: 'Qty Available',
            type: 'number',
            width: 120,
            editable: true,
        },
        {
            field: 'lastOrderedDate',
            headerName: 'Last Ordered',
            type: 'date',
            width: 150,
            editable: true,
            valueGetter: (params) => {
                if (!params.value) return null;
                return new Date(params.value);
            },
            valueFormatter: (params) => {
                if (!params.value) return '';
                try {
                    return format(new Date(params.value), 'dd MMM yyyy');
                } catch {
                    return params.value;
                }
            }
        },
        { field: 'category', headerName: 'Category', width: 150, editable: true },
        { field: 'description', headerName: 'Description', width: 200, editable: true },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id }) => {
                const isInEditMode = rowModesModel[id]?.mode === 'edit';

                if (isInEditMode) {
                    return [
                        <GridActionsCellItem
                            icon={<Save size={18} />}
                            label="Save"
                            sx={{ color: 'primary.main' }}
                            onClick={handleSaveClick(id)}
                        />,
                        <GridActionsCellItem
                            icon={<X size={18} />}
                            label="Cancel"
                            className="textPrimary"
                            onClick={handleCancelClick(id)}
                            color="inherit"
                        />,
                    ];
                }

                return [
                    <GridActionsCellItem
                        icon={<Edit2 size={18} />}
                        label="Edit"
                        className="textPrimary"
                        onClick={handleEditClick(id)}
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        icon={<Trash2 size={18} />}
                        label="Delete"
                        onClick={handleDeleteClick(id)}
                        color="inherit"
                    />,
                ];
            },
        },
    ];

    const EditToolbar = (props) => {
        const { setRows, setRowModesModel } = props;

        const handleClick = () => {
            const id = 'temp-' + Date.now();
            setRows((oldRows) => [...oldRows, {
                id,
                productName: '',
                price: 0,
                nettPrice: 0,
                quantityAvailable: 0,
                lastOrderedDate: new Date().toISOString().split('T')[0],
                category: '',
                description: '',
                isNew: true
            }]);
            setRowModesModel((oldModel) => ({
                ...oldModel,
                [id]: { mode: 'edit', fieldToFocus: 'productName' },
            }));
        };

        return (
            <GridToolbarContainer sx={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    onClick={handleClick}
                >
                    <Plus size={18} />
                    Add Item
                </button>
                {/* <GridToolbarFilterButton /> */}
            </GridToolbarContainer>
        );
    };

    // Filter rows based on search
    const filteredRows = React.useMemo(() => {
        if (!search) return rows;
        return rows.filter(row =>
            row.productName?.toLowerCase().includes(search.toLowerCase()) ||
            row.category?.toLowerCase().includes(search.toLowerCase())
        );
    }, [rows, search]);

    return (
        <div className="dashboard-container" style={{ padding: '20px' }}>
            <div className="dashboard-card">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Price List</h2>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-auto">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            <Search size={20} strokeWidth={2} />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search products..."
                            className="w-full md:w-72 pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-700 placeholder-gray-400"
                            style={{ fontSize: '14px', fontWeight: '500' }}
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={filteredRows}
                        columns={columns}
                        editMode="row"
                        rowModesModel={rowModesModel}
                        onRowModesModelChange={handleRowModesModelChange}
                        onRowEditStop={handleRowEditStop}
                        processRowUpdate={processRowUpdate}
                        slots={{
                            toolbar: EditToolbar,
                        }}
                        slotProps={{
                            toolbar: { setRows, setRowModesModel },
                        }}
                        loading={loading}
                        initialState={{
                            pagination: {
                                paginationModel: { page: 0, pageSize: 10 },
                            },
                        }}
                        pageSizeOptions={[10, 25, 50]}
                        disableRowSelectionOnClick
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-cell': {
                                borderBottom: '1px solid #f0f0f0',
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                fontWeight: 'bold',
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PriceList;