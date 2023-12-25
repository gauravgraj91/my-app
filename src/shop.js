import React from 'react';
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

const Shop = () => {
  return (
    <div>
      <div>
        <TextField 
          label="Enter text..." 
          variant="outlined" 
        />
        <Button variant="contained">Save</Button>
        <TextField 
          label="Enter more text..." 
          variant="outlined" 
        />
        <Button variant="contained">Save</Button>
      </div>
    </div>
  );
};

export default Shop;