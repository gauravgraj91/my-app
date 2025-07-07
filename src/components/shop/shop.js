import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Moon, Sun, Check, Trash2, Plus, Save as SaveIcon, Pencil, Calendar } from 'lucide-react';
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
import { format } from 'date-fns';

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
  const [lastActionType, setLastActionType] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [editingDateId, setEditingDateId] = useState(null);
  const [tempDate, setTempDate] = useState("");

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

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
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
      showToast("Product added successfully!", 'success');
    } catch (error) {
      showToast('Failed to add product. Please try again.', 'error');
    }
  };

  const handleDeleteRow = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteShopProduct(id);
        showToast("Product deleted successfully!", 'error');
      } catch (error) {
        showToast('Failed to delete product. Please try again.', 'error');
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
      showToast('Product updated successfully!', 'success');
      setModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      showToast('Failed to update product. Please try again.', 'error');
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

  // Category color mapping and icon
  const categoryTag = (cat) => {
    let color = 'bg-gray-100 text-gray-800';
    let icon = <span className="mr-1">📦</span>;
    switch ((cat || '').toLowerCase()) {
      case 'groceries': color = 'bg-green-100 text-green-800'; icon = <span className="mr-1">🛒</span>; break;
      case 'electronics': color = 'bg-blue-100 text-blue-800'; icon = <span className="mr-1">💻</span>; break;
      case 'accessories': color = 'bg-orange-100 text-orange-800'; icon = <span className="mr-1">🧢</span>; break;
      case 'clothing': color = 'bg-purple-100 text-purple-800'; icon = <span className="mr-1">👕</span>; break;
    }
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${color}`}>{icon}{cat || ''}</span>;
  };

  // Date formatting helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // Date cell rendering
  const renderDateCell = (row) => {
    if (editingDateId === row.id) {
      return (
        <form onSubmit={async (e) => {
          e.preventDefault();
          await handleCellEdit(row.id, 'date', tempDate);
          setEditingDateId(null);
        }} className="flex items-center gap-2">
          <input
            type="date"
            value={tempDate}
            onChange={e => setTempDate(e.target.value)}
            className="dashboard-input"
            aria-label="Edit Date"
            autoFocus
            onBlur={() => setEditingDateId(null)}
            style={{ minWidth: 120 }}
          />
          <button type="submit" className="text-blue-600 font-bold" aria-label="Save Date">OK</button>
        </form>
      );
    }
    return (
      <button
        className="flex items-center gap-1 text-gray-700 hover:text-blue-600 focus:outline-none whitespace-nowrap"
        onClick={() => { setEditingDateId(row.id); setTempDate(row.date || ''); }}
        aria-label="Edit Date"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <Calendar size={16} />
        <span>{formatDate(row.date)}</span>
      </button>
    );
  };

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
            className="dashboard-btn-primary bg-green-600 hover:bg-green-700 text-white text-base px-6 py-3 flex items-center gap-2"
            onClick={handleAddRow}
            aria-label="Add Product"
            style={{ fontWeight: 700, fontSize: '1.08rem', boxShadow: '0 2px 8px rgba(16,185,129,0.12)' }}
          >
            <Plus size={20} /> Add Product
          </button>
          <button
            className="dashboard-btn-secondary flex items-center gap-2"
            onClick={handleSave}
            aria-label="Save"
          >
            <SaveIcon size={18} /> Save
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
          <div className={`p-4 border rounded-lg ${lastActionType === 'delete' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'}`}>
            {success}
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded shadow-lg text-base font-semibold transition-all ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {toast.message}
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
              <th className="text-right">MRP</th>
              <th className="text-right">Qty / Units</th>
              <th className="text-right">Nett Amount</th>
              <th className="text-right">Price per Unit</th>
              <th className="text-right">Profit per Unit</th>
              <th className="text-right">Total Profit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center py-4 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">🛒</span>
                    <span>No products found. Add your first product!</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map(row => (
                <tr
                  key={row.id}
                  className={`hover:bg-blue-100 transition-colors ${selectedProduct && selectedProduct.id === row.id && modalOpen ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`}
                >
                  <td>{row.billNumber}</td>
                  <td>{renderDateCell(row)}</td>
                  <td>{renderEditableCell(row, "productName")}</td>
                  <td>{categoryTag(row.category)}</td>
                  <td className="text-right">{renderEditableCell(row, "mrp", "number")}</td>
                  <td className="text-right">{renderEditableCell(row, "totalQuantity", "number")}</td>
                  <td className="text-right">{renderEditableCell(row, "totalAmount", "number")}</td>
                  <td className="text-right">{formatCurrency(row.pricePerPiece || 0)}</td>
                  <td className="text-right">{formatCurrency(calculateProfitPerPiece(row.mrp || 0, row.pricePerPiece || 0))}</td>
                  <td className="text-right">{formatCurrency(calculateProfitPerPiece(row.mrp || 0, row.pricePerPiece || 0) * (row.totalQuantity || 0))}</td>
                  <td className="flex gap-2 items-center justify-center">
                    <button
                      className="dashboard-btn-secondary flex items-center gap-1 px-2 py-1"
                      aria-label="Edit Product"
                      title="Edit Product"
                      onClick={() => { setSelectedProduct(row); setModalOpen(true); }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="dashboard-btn-danger"
                      aria-label="Delete Product"
                      title="Delete Product"
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
              <td colSpan="6" className="font-bold text-right">Total</td>
              <td className="text-right">{formatCurrency(calculateTotalAmount())}</td>
              <td colSpan="2"></td>
              <td className="text-right">{formatCurrency(calculateTotalProfit())}</td>
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