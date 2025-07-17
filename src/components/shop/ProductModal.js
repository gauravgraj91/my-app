import React, { useState, useEffect } from 'react';

const defaultCategories = [
  'Clothing',
  'Electronics',
  'Groceries',
  'Accessories',
  'Other'
];

const defaultVendors = [
  'ABC Suppliers',
  'XYZ Distributors',
  'Local Market',
  'Online Store',
  'Direct Import',
  'Other'
];

const ProductModal = ({ open, onClose, product, onSave, categories = defaultCategories, vendors = defaultVendors }) => {
  const [form, setForm] = useState({ ...product });
  const [saving, setSaving] = useState(false);
  const [newVendor, setNewVendor] = useState('');
  const [showAddVendor, setShowAddVendor] = useState(false);

  useEffect(() => {
    setForm({ ...product });
  }, [product]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  };

  const handleAddVendor = () => {
    if (newVendor.trim()) {
      // In a real app, you would update this in your database
      setForm((prev) => ({ ...prev, vendor: newVendor.trim() }));
      setNewVendor('');
      setShowAddVendor(false);
    }
  };

  // Calculate price per piece and profit per piece
  const pricePerPiece =
    form.totalQuantity && form.totalAmount
      ? Number(form.totalAmount) / Number(form.totalQuantity)
      : 0;
  const profitPerPiece =
    form.mrp && pricePerPiece
      ? Number(form.mrp) - pricePerPiece
      : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Save calculated fields
    await onSave({
      ...form,
      pricePerPiece: Number(pricePerPiece.toFixed(2)),
      profitPerPiece: Number(profitPerPiece.toFixed(2)),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">Edit Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
              <input
                name="billNumber"
                value={form.billNumber || ''}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                name="date"
                type="date"
                value={form.date || ''}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                name="productName"
                value={form.productName || ''}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={form.category || ''}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
              {showAddVendor ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Enter new vendor name"
                  />
                  <button
                    type="button"
                    onClick={handleAddVendor}
                    className="px-2 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddVendor(false)}
                    className="px-2 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    name="vendor"
                    value={form.vendor || ''}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor} value={vendor}>{vendor}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddVendor(true)}
                    className="px-2 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 whitespace-nowrap"
                  >
                    New
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
              <input
                name="mrp"
                type="number"
                value={form.mrp || ''}
                onChange={handleNumberChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                name="totalQuantity"
                type="number"
                value={form.totalQuantity || ''}
                onChange={handleNumberChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <input
                name="totalAmount"
                type="number"
                value={form.totalAmount || ''}
                onChange={handleNumberChange}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
          {/* Calculated fields */}
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Price per Piece</label>
              <div className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                {pricePerPiece ? pricePerPiece.toFixed(2) : '0.00'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Profit per Piece</label>
              <div className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                {profitPerPiece ? profitPerPiece.toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal; 