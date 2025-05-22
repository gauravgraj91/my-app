import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Moon, Sun, Check, Trash2 } from 'lucide-react';
import './styles/Shop.css';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

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
  const [profitPieChartData, setProfitPieChartData] = useState([])
  const [darkMode, setDarkMode] = useState(false)
  const [showSaveAnimation, setShowSaveAnimation] = useState(false)

  useEffect(() => {
    updatePieChartData()
    updateProfitPieChartData()
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

  const updateProfitPieChartData = () => {
    const totalNettAmount = calculateTotalAmount();
    const totalProfit = calculateTotalProfit();
    const newProfitPieChartData = [
      { name: 'Nett Amount', value: totalNettAmount - totalProfit },
      { name: 'Total Profit', value: totalProfit }
    ];
    setProfitPieChartData(newProfitPieChartData);
  };

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
                ? (updatedItem.totalAmount / updatedItem.totalQuantity).toFixed(2)
                : 0
          }
          if (field === "mrp" || field === "pricePerPiece" || field === "totalAmount" || field === "totalQuantity") {
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

  const handleDeleteRow = (id) => {
    setData(prevData => prevData.filter(item => item.id !== id));
  };

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
        <input
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
          className="dashboard-input"
          aria-label={field}
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

  const calculateTotalAmount = () => {
    return data.reduce((total, item) => total + item.totalAmount, 0);
  };

  const calculateTotalProfit = () => {
    return data.reduce((total, item) => total + (item.profitPerPiece * item.totalQuantity), 0);
  };

  const calculateProfitPerPiece = (mrp, pricePerPiece) => {
    return (mrp - pricePerPiece).toFixed(2);
  };

  return (
    <div className={`dashboard-container${darkMode ? ' dark' : ''}`}> 
      <div className="dashboard-card dashboard-header">
        <h1 className="dashboard-title">Shop Dashboard</h1>
        <button
          aria-label="Toggle dark mode"
          className="dashboard-dark-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? <Sun /> : <Moon />}
        </button>
      </div>

      <div className="dashboard-charts">
        <div className="dashboard-card dashboard-chart">
          <h2 className="dashboard-chart-title">Product Sales Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="dashboard-card dashboard-chart">
          <h2 className="dashboard-chart-title">Nett Amount vs Total Profit</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={profitPieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {profitPieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-card dashboard-controls">
        <button
          className="dashboard-btn-primary"
          onClick={handleAddRow}
          aria-label="Add Product"
        >
          Add Product
        </button>
        <button
          className="dashboard-btn-secondary"
          onClick={handleSave}
          aria-label="Save"
        >
          Save
          {showSaveAnimation && <Check className="dashboard-save-check" />}
        </button>
      </div>

      <div className="dashboard-card dashboard-table-container">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Bill Number</th>
              <th>Date</th>
              <th>Product Name</th>
              <th>MRP</th>
              <th>Qty / Units</th>
              <th>Nett Amount</th>
              <th>Price per Unit</th>
              <th>Profit per Unit</th>
              <th>Total Profit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id}>
                <td>{row.billNumber}</td>
                <td>
                  <input
                    type="date"
                    value={row.date}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={e => handleCellEdit(row.id, "date", e.target.value)}
                    className="dashboard-input"
                    aria-label="Date"
                  />
                </td>
                <td>{renderEditableCell(row, "productName")}</td>
                <td>{renderEditableCell(row, "mrp", "number")}</td>
                <td>{renderEditableCell(row, "totalQuantity", "number")}</td>
                <td>{renderEditableCell(row, "totalAmount", "number")}</td>
                <td>{formatCurrency(row.pricePerPiece)}</td>
                <td>{formatCurrency(calculateProfitPerPiece(row.mrp, row.pricePerPiece))}</td>
                <td>{formatCurrency(calculateProfitPerPiece(row.mrp, row.pricePerPiece) * row.totalQuantity)}</td>
                <td>
                  <button
                    className="dashboard-btn-danger"
                    aria-label="Delete Product"
                    onClick={() => handleDeleteRow(row.id)}
                  >
                    <Trash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="5">Total</td>
              <td>{formatCurrency(calculateTotalAmount())}</td>
              <td colSpan="2"></td>
              <td>{formatCurrency(calculateTotalProfit())}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default Shop;