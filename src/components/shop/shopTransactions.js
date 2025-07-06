import React, { useState, useEffect } from "react"
import { addTransaction, subscribeToTransactions, deleteTransaction } from '../../firebase/transactionService'

const ShopTransactions = () => {
  const [transactions, setTransactions] = useState([])
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("cashIn")
  const [comment, setComment] = useState("")
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToTransactions((transactions) => {
      setTransactions(transactions)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Clear notifications after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatDate = (date) => {
    if (date?.toDate) {
      return date.toDate().toLocaleString('en-IN')
    }
    return new Date(date).toLocaleString('en-IN')
  }

  const handleTransaction = async () => {
    if (amount === "" || Number(amount) === 0) {
      setError("Amount cannot be zero")
      return
    }

    if (!comment.trim()) {
      setError("Please add a comment for the transaction")
      return
    }

    setSubmitting(true)
    try {
      const newTransaction = {
        type,
        amount: Number(amount),
        date: new Date(),
        comment: comment.trim()
      }

      await addTransaction(newTransaction)
      setAmount("")
      setComment("")
      setSuccess("Transaction added successfully!")
    } catch (error) {
      console.error('Error adding transaction:', error)
      setError('Failed to add transaction. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTransaction = async (transactionId) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteTransaction(transactionId)
        setSuccess("Transaction deleted successfully!")
      } catch (error) {
        console.error('Error deleting transaction:', error)
        setError('Failed to delete transaction. Please try again.')
      }
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === "all") return true
    return transaction.type === filter
  })

  const totalCashIn = filteredTransactions
    .filter(transaction => transaction.type === "cashIn")
    .reduce((acc, transaction) => acc + transaction.amount, 0)

  const totalCashOut = filteredTransactions
    .filter(transaction => transaction.type === "cashOut")
    .reduce((acc, transaction) => acc + transaction.amount, 0)

  const netAmount = totalCashIn - totalCashOut

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center text-lg">Loading transactions...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Shop Transactions</h1>
      
      {/* Notifications */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Total Cash In</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCashIn)}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800">Total Cash Out</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCashOut)}</p>
        </div>
        <div className={`p-4 rounded-lg ${netAmount >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
          <h3 className="text-lg font-semibold">Net Amount</h3>
          <p className={`text-2xl font-bold ${netAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {formatCurrency(netAmount)}
          </p>
        </div>
      </div>

      {/* Add Transaction Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Transaction</h2>
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type
              </label>
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setType("cashIn")}
                  className={`flex-1 py-3 px-4 font-semibold text-white rounded-l-md transition-colors ${
                    type === "cashIn" ? "bg-green-500" : "bg-gray-300 hover:bg-gray-400"
                  }`}
                >
                  Cash In
                </button>
                <button
                  type="button"
                  onClick={() => setType("cashOut")}
                  className={`flex-1 py-3 px-4 font-semibold text-white rounded-r-md transition-colors ${
                    type === "cashOut" ? "bg-red-500" : "bg-gray-300 hover:bg-gray-400"
                  }`}
                >
                  Cash Out
                </button>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment
            </label>
            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter transaction comment"
            />
          </div>
          
          <button
            type="button"
            onClick={handleTransaction}
            disabled={submitting}
            className="w-full py-3 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Adding Transaction..." : "Add Transaction"}
          </button>
        </form>
      </div>

      {/* Filter Buttons */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {["all", "cashIn", "cashOut"].map((filterType) => (
            <button
              key={filterType}
              type="button"
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filter === filterType
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {filterType === "all" ? "All" : filterType === "cashIn" ? "Cash In" : "Cash Out"}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.type === "cashIn" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {transaction.type === "cashIn" ? "Cash In" : "Cash Out"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.comment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ShopTransactions
