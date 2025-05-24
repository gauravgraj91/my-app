import React, { useState } from "react"

const ShopTransactions = () => {
  const [transactions, setTransactions] = useState([])
  const [amount, setAmount] = useState("")
  const [type, setType] = useState("cashIn")
  const [comment, setComment] = useState("")
  const [filter, setFilter] = useState("all")

  const handleTransaction = () => {
    if (amount === "" || Number(amount) === 0) {
      alert("Amount cannot be zero")
      return
    }
    const newTransaction = {
      id: transactions.length + 1,
      type,
      amount: Number(amount),
      date: new Date(),
      comment
    }
    setTransactions([...transactions, newTransaction])
    setAmount("")
    setComment("")
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

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Shop Transactions</h1>
      <form className="flex flex-col mb-4">
        <label className="block mb-2">
          <span className="block text-sm font-medium text-gray-700">
            Amount
          </span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="block w-full p-2 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500"
          />
        </label>
        <div className="flex mb-2">
          <button
            type="button"
            onClick={() => setType("cashIn")}
            className={`px-4 py-2 text-lg font-bold text-white ${
              type === "cashIn" ? "bg-blue-500" : "bg-gray-300"
            } rounded-l-md hover:bg-blue-700 focus:outline-none focus:ring focus:border-blue-500`}
          >
            Cash In
          </button>
          <button
            type="button"
            onClick={() => setType("cashOut")}
            className={`px-4 py-2 text-lg font-bold text-white ${
              type === "cashOut" ? "bg-blue-500" : "bg-gray-300"
            } rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring focus:border-blue-500`}
          >
            Cash Out
          </button>
        </div>
        <label className="block mb-2">
          <span className="block text-sm font-medium text-gray-700">
            Comment
          </span>
          <input
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="block w-full p-2 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-500"
          />
        </label>
        <button
          type="button"
          onClick={handleTransaction}
          className="px-2 py-1 text-lg font-bold text-white bg-blue-500 rounded-md hover:bg-blue-700 focus:outline-none focus:ring focus:border-blue-500"
        >
          Add Transaction
        </button>
      </form>
      <div className="flex mb-4">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-4 py-2 text-lg font-bold text-white ${
            filter === "all" ? "bg-blue-500" : "bg-gray-300"
          } rounded-l-md hover:bg-blue-700 focus:outline-none focus:ring focus:border-blue-500`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("cashIn")}
          className={`px-4 py-2 text-lg font-bold text-white ${
            filter === "cashIn" ? "bg-blue-500" : "bg-gray-300"
          } hover:bg-blue-700 focus:outline-none focus:ring focus:border-blue-500`}
        >
          Cash In
        </button>
        <button
          type="button"
          onClick={() => setFilter("cashOut")}
          className={`px-4 py-2 text-lg font-bold text-white ${
            filter === "cashOut" ? "bg-blue-500" : "bg-gray-300"
          } rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring focus:border-blue-500`}
        >
          Cash Out
        </button>
      </div>
      <table className="w-full table-auto mb-4">
        <thead>
          <tr>
            <th className="px-4 py-2 text-lg font-bold text-gray-700 border-collapse border border-slate-500">
              Date
            </th>
            <th className="px-4 py-2 text-lg font-bold text-gray-700 border-collapse border border-slate-500">
              Type
            </th>
            <th className="px-4 py-2 text-lg font-bold text-gray-700 border-collapse border border-slate-500">
              Amount
            </th>
            <th className="px-4 py-2 text-lg font-bold text-gray-700 border-collapse border border-slate-500">
              Comment
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions.map(transaction => (
            <tr key={transaction.id}>
              <td className="px-4 py-2 text-lg text-gray-700">
                {transaction.date.toLocaleString()}
              </td>
              <td className="px-4 py-2 text-lg text-gray-700">
                {transaction.type === "cashIn" ? "Cash In" : "Cash Out"}
              </td>
              <td className="px-4 py-2 text-lg text-gray-700">
                {transaction.amount}
              </td>
              <td className="px-4 py-2 text-lg text-gray-700">
                {transaction.comment}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-between mb-4">
        <p className="text-lg font-bold text-gray-700">
          Total Cash In: {totalCashIn}
        </p>
        <p className="text-lg font-bold text-gray-700">
          Total Cash Out: {totalCashOut}
        </p>
      </div>
    </div>
  )
}

export default ShopTransactions
