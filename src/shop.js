import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { responsiveFontSizes } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Moon, Sun, Check } from 'lucide-react';
import './styles/Shop.css';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

const initialData = [
  {
    id: 1,
    billNumber: "001",
    date: new Date().toISOString().split("T")[0],
    productName: "T-Shirt",
    mrp: 30,
    totalQuantity: 20,
    totalAmount: 500,
    pricePerPiece: 25,
    profitPerPiece: 5
  },
  {
    id: 2,
    billNumber: "002",
    date: new Date().toISOString().split("T")[0],
    productName: "Jeans",
    mrp: 70,
    totalQuantity: 20,
    totalAmount: 1200,
    pricePerPiece: 60,
    profitPerPiece: 10
  },
  {
    id: 3,
    billNumber: "003",
    date: new Date().toISOString().split("T")[0],
    productName: "Sneakers",
    mrp: 90,
    totalQuantity: 10,
    totalAmount: 800,
    pricePerPiece: 80,
    profitPerPiece: 10
  }
]

const Shop = () => {
  const [data, setData] = useState(initialData)
  const [editingCell, setEditingCell] = useState(null)
  const [tempEditValue, setTempEditValue] = useState("")
  const [pieChartData, setPieChartData] = useState([])
  const [darkMode, setDarkMode] = useState(false)
  const [showSaveAnimation, setShowSaveAnimation] = useState(false)

  useEffect(() => {
    updatePieChartData()
  }, [data])

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode)
  }, [darkMode])

  const updatePieChartData = () => {
    const newPieChartData = data.map(item => ({
      name: item.productName,
      value: item.totalAmount
    }))
    setPieChartData(newPieChartData)
  }

  const handleSave = () => {
    console.log("Saving data:", data)
    setShowSaveAnimation(true)
    setTimeout(() => setShowSaveAnimation(false), 2000)
  }

  const handleCellEdit = (id, field, value) => {
    setData(prevData =>
      prevData.map(item => {
        if (item.id === id) {
          let updatedItem = { ...item, [field]: value }
          if (field === "totalAmount" || field === "totalQuantity") {
            updatedItem.pricePerPiece =
              updatedItem.totalQuantity > 0
                ? (updatedItem.totalAmount / updatedItem.totalQuantity).toFixed(
                    2
                  )
                : 0
          }
          if (field === "mrp" || field === "pricePerPiece") {
            updatedItem.profitPerPiece = (
              updatedItem.mrp - updatedItem.pricePerPiece
            ).toFixed(2)
          }
          return updatedItem
        }
        return item
      })
    )
    setEditingCell(null)
  }

  const handleKeyDown = (e, id, field, value) => {
    if (e.key === "Enter") {
      handleCellEdit(id, field, value)
    } else if (e.key === "Escape") {
      setEditingCell(null)
    }
  }

  const handleAddRow = () => {
    const newId = Math.max(...data.map(item => item.id)) + 1
    const newRow = {
      id: newId,
      billNumber: `00${newId}`,
      date: new Date().toISOString().split("T")[0],
      productName: "",
      mrp: 0,
      totalQuantity: 0,
      totalAmount: 0,
      pricePerPiece: 0,
      profitPerPiece: 0
    }
    setData([...data, newRow])
  }

  const formatCurrency = value => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(value)
  }

  const renderEditableCell = (row, field, type = "text") => {
    const isEditing = editingCell === `${row.id}-${field}`
    const value = row[field]

    if (isEditing) {
      return (
        <TextField
          type={type}
          value={tempEditValue}
          onChange={e => setTempEditValue(e.target.value)}
          onKeyDown={e =>
            handleKeyDown(
              e,
              row.id,
              field,
              type === "number" ? parseFloat(tempEditValue) : tempEditValue
            )
          }
          onBlur={() =>
            handleCellEdit(
              row.id,
              field,
              type === "number" ? parseFloat(tempEditValue) : tempEditValue
            )
          }
          autoFocus
          className="w-full p-1 bg-white dark:bg-gray-700 text-black dark:text-white"
        />
      )
    } else {
      return (
        <span
          onClick={() => {
            setEditingCell(`${row.id}-${field}`)
            setTempEditValue(value.toString())
          }}
          className="cursor-pointer"
        >
          {field === "totalQuantity"
            ? value
            : type === "number"
            ? formatCurrency(value)
            : value}
        </span>
      )
    }
  }

  return (
    <div
      className={`p-4 ${
        darkMode ? "dark bg-gray-800 text-white" : "bg-white text-black"
      }`}
    >
      <div className="header-container">
        <h1 className="dashboard-title">Shop Dashboard</h1>
        <Button
          onClick={() => setDarkMode(!darkMode)}
          className="dark-mode-toggle"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <div className="mb-8 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="button-container">
        <Button variant="contained"
          onClick={handleAddRow}
          className="add-button"
        >
          Add Product
        </Button>
        <Button variant="contained" color="success"
          onClick={handleSave}
          className="save-button"
        >
          Save
          {showSaveAnimation && <Check className="ml-2 h-5 w-5 text-green-300" />}
        </Button>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-700">
            <th className="border p-2">Bill Number</th>
            <th className="border p-2">Date</th>
            <th className="border p-2">Product Name</th>
            <th className="border p-2">MRP</th>
            <th className="border p-2">Total Quantity</th>
            <th className="border p-2">Total Amount</th>
            <th className="border p-2">Price per Piece</th>
            <th className="border p-2">Profit per Piece</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr
              key={row.id}
              className="hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              <td className="border p-2">{row.billNumber}</td>
              <td className="border p-2">
                <input
                  type="date"
                  value={row.date}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={e => handleCellEdit(row.id, "date", e.target.value)}
                  className="w-full bg-transparent"
                />
              </td>
              <td dir="ltr" className="border-s-4 p-2">
                {renderEditableCell(row, "productName")}
              </td>
              <td className="border p-2">
                {renderEditableCell(row, "mrp", "number")}
              </td>
              <td className="border p-2">
                {renderEditableCell(row, "totalQuantity", "number")}
              </td>
              <td className="border p-2">
                {renderEditableCell(row, "totalAmount", "number")}
              </td>
              <td className="border p-2">
                {formatCurrency(row.pricePerPiece)}
              </td>
              <td className="border p-2">
                {formatCurrency(row.profitPerPiece)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Shop;