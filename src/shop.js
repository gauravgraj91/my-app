import React from 'react';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { DataGrid } from '@mui/x-data-grid';

const Shop = () => {

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'firstName', headerName: 'First name', width: 130 },
    { field: 'lastName', headerName: 'Last name', width: 130 },
    {
      field: 'age',
      headerName: 'Age',
      type: 'number',
      width: 90,
    },
    {
      field: 'fullName',
      headerName: 'Full name',
      description: 'This column has a value getter and is not sortable.',
      sortable: false,
      width: 160,
      valueGetter: (params) =>
        `${params.row.firstName || ''} ${params.row.lastName || ''}`,
    },
  ];
  
  const rows = [
    { id: 1, lastName: 'Snow', firstName: 'Jon', age: 35 }
  ];

  return (
    <div>
      <div>
        <TextField 
          label="Enter Product Name..." 
          variant="outlined" 
        />
        <TextField 
          label="Enter MRP of the Product..." 
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
            paginationModel: { page: 0, pageSize: 5 },
          },
        }}
        pageSizeOptions={[5, 10]}
        checkboxSelection
      />
        </div>
    </div>
  );
};

export default Shop;