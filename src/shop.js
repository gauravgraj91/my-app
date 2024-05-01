import React from 'react';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { DataGrid } from '@mui/x-data-grid';
import { responsiveFontSizes } from '@mui/material';

const Shop = () => {

  const columns = [
    { field: 'id', headerName: 'ID', width: 70, sortable: false },
    { field: 'productName', headerName: 'Product Name', width: 150 },
    { field: 'MRP', headerName: 'MRP', width: 130, type: 'number' },
    { field: 'purchasePrice', headerName: 'Purchase Price', type: 'number', width: 150},
    { field: 'quantity', headerName: 'Quantity', type: 'number', width: 100},
    { field: 'perUnitPrice', headerName: 'Unit Price', type: 'number', width: 100},
    { field: 'totalMargin', headerName: 'Total Margin', type: 'number', width: 100,
    },
    {
      field: 'fullName',
      headerName: 'Full name',
      description: 'This column has a value getter and is not sortable.',
      sortable: false,
      width: 160,
      valueGetter: (params) =>
        `${params.row.productName || ''} ${params.row.MRP || '' } ${params.row.MRP || '' } ${params.row.purchasePrice || '' } ${params.row.quantity || '' } ${params.row.perUnitPrice || '' } ${params.row.totalMargin || '' }`,
    },
  ];
  
  const rows = [
    { id: 1, productName: 'Product 1', MRP: 100, purchasePrice: 50, quantity: 10, perUnitPrice: 5, totalMargin: 50},
  ];

  return (
    <div>
      <div style={{ padding: '0 16px'}}>
        <TextField 
          style={{ padding: '0 16px'}}
          size="small"
          label="Enter Product Name" 
          variant="outlined" 
        />
        <TextField 
          style={{ padding: '0 16px'}}
          size="small"
          label="Enter MRP" 
          variant="outlined" 
        />
        <Button variant="contained">Save</Button>
      </div>
      <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 10, pageSize: 5 },
          },
        }}
        pageSizeOptions={[10, 50]}
        checkboxSelection
      />
        </div>
    </div>
  );
};

export default Shop;