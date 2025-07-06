import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Moon, Sun, Check, Trash2 } from 'lucide-react';
import './Shop.css';
import ShopTransactions from './shopTransactions';
import PriceList from './PriceList';
import ProductModal from './ProductModal';
import { 
  addShopProduct, 
  subscribeToShopProducts, 
  deleteShopProduct, 
  updateShopProduct 
} from '../../firebase/shopProductService';

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];
const CATEGORIES = ['Clothing', 'Electronics', 'Groceries', 'Accessories', 'Other'];

const Shop = () => {
  const [data, setData] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [tempEditValue, setTempEditValue] = useState("");
  const [pieChartData, setPieChartData] = useState([]);
  const [profitPieChartData, setProfitPieChartData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToShopProducts((products) => {
      setData(products);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Clear notifications after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    updatePieChartData();
    updateProfitPieChartData();
  }, [data]);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const updatePieChartData = () => {
    const newPieChartData = data.map(item => ({
      name: item.productName || 'Unnamed Product',
      value: item.totalAmount || 0
    }));
    setPieChartData(newPieChartData);
  };

  const updateProfitPieChartData = () => {
    const totalNettAmount = calculateTotalAmount();
    const totalProfit = calculateTotalProfit();
    const newProfitPieChartData = [
      { name: 'Nett Amount', value: totalNettAmount - totalProfit },
      { name: 'Total Profit', value: totalProfit }
    ];
    setProfitPieChartData(newProfitPieChartData);
  };

  const handleSave = async () => {
    try {
      setShowSaveAnimation(true);
      setSuccess("Data saved successfully!");
      setTimeout(() => setShowSaveAnimation(false), 2000);
    } catch (error) {
      setError("Failed to save data. Please try again.");
    }
  };

  const handleCellEdit = async (id, field, value) => {
    try {
      let updatedData = { [field]: value };
      if (field === "totalAmount" || field === "totalQuantity") {
        const product = data.find(item => item.id === id);
        const totalQuantity = field === "totalQuantity" ? value : (product?.totalQuantity || 0);
        const totalAmount = field === "totalAmount" ? value : (product?.totalAmount || 0);
        if (totalQuantity > 0) {
          updatedData.pricePerPiece = (totalAmount / totalQuantity).toFixed(2);
        }
      }
      if (field === "mrp" || field === "pricePerPiece" || field === "totalAmount" || field === "totalQuantity") {
        const product = data.find(item => item.id === id);
        const mrp = field === "mrp" ? value : (product?.mrp || 0);
        const pricePerPiece = field === "pricePerPiece" ? value : (product?.pricePerPiece || 0);
        updatedData.profitPerPiece = (mrp - pricePerPiece).toFixed(2);
      }
      await updateShopProduct(id, updatedData);
      setEditingCell(null);
    } catch (error) {
      console.error('Error updating product:', error);
      setError('Failed to update product. Please try again.');
    }
  };

  const handleKeyDown = (e, id, field, value) => {
    if (e.key === "Enter") {
      handleCellEdit(id, field, value);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const handleAddRow = async () => {
    try {
      const newProduct = {
        billNumber: `00${data.length + 1}`,
        date: new Date().toISOString().split("T")[0],
        productName: "",
        category: CATEGORIES[0],
        mrp: 0,
        totalQuantity: 0,
        totalAmount: 0,
        pricePerPiece: 0,
        profitPerPiece: 0
      };
      await addShopProduct(newProduct);
      setSuccess("Product added successfully!");
    } catch (error) {
      console.error('Error adding product:', error);
      setError('Failed to add product. Please try again.');
    }
  };

  const handleDeleteRow = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteShopProduct(id);
        setSuccess("Product deleted successfully!");
      } catch (error) {
        console.error('Error deleting product:', error);
        setError('Failed to delete product. Please try again.');
      }
    }
  };

  const handleRowClick = (row) => {
    setSelectedProduct(row);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  const handleModalSave = async (updatedProduct) => {
    try {
      await updateShopProduct(updatedProduct.id, updatedProduct);
      setSuccess('Product updated successfully!');
      setModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      setError('Failed to update product. Please try again.');
    }
  };

  const formatCurrency = value => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(value);
  };

  const renderEditableCell = (row, field, type = "text") => {
    const isEditing = editingCell === `${row.id}-${field}`;
    const value = row[field] || "";
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
      );
    } else {
      return (
        <span
          onClick={() => {
            setEditingCell(`${row.id}-${field}`);
            setTempEditValue(value.toString());
          }}
          className="cursor-pointer"
        >
          {field === "totalQuantity"
            ? value
            : type === "number"
            ? formatCurrency(value)
            : value}
        </span>
      );
    }
  };

  const calculateTotalAmount = () => {
    return data.reduce((total, item) => total + (item.totalAmount || 0), 0);
  };

  const calculateTotalProfit = () => {
    return data.reduce((total, item) => total + ((item.profitPerPiece || 0) * (item.totalQuantity || 0)), 0);
  };

  const calculateProfitPerPiece = (mrp, pricePerPiece) => {
    return (mrp - pricePerPiece).toFixed(2);
  };

  // Filtered data based on search
  const filteredData = data.filter(row => {
    const searchLower = search.toLowerCase();
    return (
      row.productName?.toLowerCase().includes(searchLower) ||
      row.billNumber?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="text-center text-lg">Loading shop data...</div>
      </div>
    );
  }

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
      {/* Search and buttons below charts, above table */}
      <div className="dashboard-card dashboard-controls flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by product name or bill number..."
          className="w-full max-w-xs p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 md:mb-0"
        />
        <div className="flex gap-2">
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
      </div>

      {/* Notifications */}
      {error && (
        <div className="dashboard-card">
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        </div>
      )}
      
      {success && (
        <div className="dashboard-card">
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        </div>
      )}

      <div className="dashboard-card dashboard-table-container">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Bill Number</th>
              <th>Date</th>
              <th>Product Name</th>
              <th>Category</th>
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
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center py-4 text-gray-500">
                  No products found. Add your first product!
                </td>
              </tr>
            ) : (
              filteredData.map(row => (
                <tr key={row.id} className="hover:bg-blue-50 cursor-pointer" onClick={e => { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'svg' && e.target.tagName !== 'path') handleRowClick(row); }}>
                  <td>{row.billNumber}</td>
                  <td>
                    <input
                      type="date"
                      value={row.date || ""}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={e => handleCellEdit(row.id, "date", e.target.value)}
                      className="dashboard-input"
                      aria-label="Date"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td>{renderEditableCell(row, "productName")}</td>
                  <td>{row.category || ''}</td>
                  <td>{renderEditableCell(row, "mrp", "number")}</td>
                  <td>{renderEditableCell(row, "totalQuantity", "number")}</td>
                  <td>{renderEditableCell(row, "totalAmount", "number")}</td>
                  <td>{formatCurrency(row.pricePerPiece || 0)}</td>
                  <td>{formatCurrency(calculateProfitPerPiece(row.mrp || 0, row.pricePerPiece || 0))}</td>
                  <td>{formatCurrency(calculateProfitPerPiece(row.mrp || 0, row.pricePerPiece || 0) * (row.totalQuantity || 0))}</td>
                  <td>
                    <button
                      className="dashboard-btn-danger"
                      aria-label="Delete Product"
                      onClick={e => { e.stopPropagation(); handleDeleteRow(row.id); }}
                    >
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="6">Total</td>
              <td>{formatCurrency(calculateTotalAmount())}</td>
              <td colSpan="2"></td>
              <td>{formatCurrency(calculateTotalProfit())}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ProductModal
        open={modalOpen}
        onClose={handleModalClose}
        product={selectedProduct}
        onSave={handleModalSave}
        categories={CATEGORIES}
      />
    </div>
  );
};

export default Shop;