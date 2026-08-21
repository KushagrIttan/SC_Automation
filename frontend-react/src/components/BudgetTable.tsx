import React, { useState } from 'react';

interface BudgetItem {
  item: string;
  quantity: number;
  unitCost: number;
  gstApplicable: boolean;
}

interface BudgetTableProps {
  onCalculate: (items: BudgetItem[]) => void;
}

const BudgetTable = ({ onCalculate }: BudgetTableProps) => {
  const [items, setItems] = useState<BudgetItem[]>([
    { item: '', quantity: 1, unitCost: 0, gstApplicable: true }
  ]);
  const [total, setTotal] = useState(0);
  const [gst, setGst] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  const handleItemChange = (index: number, field: keyof BudgetItem, value: string | number | boolean) => {
    const newItems = [...items];
    newItems[index][field] = value as never;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { item: '', quantity: 1, unitCost: 0, gstApplicable: true }]);
  };

  const calculateBudget = () => {
    let subtotal = 0;
    let gstTotal = 0;
    
    items.forEach((item) => {
      const itemTotal = item.quantity * item.unitCost;
      subtotal += itemTotal;
      if (item.gstApplicable) {
        gstTotal += itemTotal * 0.18;
      }
    });
    
    setTotal(subtotal);
    setGst(gstTotal);
    setGrandTotal(subtotal + gstTotal);
    onCalculate(items);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-4">Budget Estimation</h3>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item, index) => (
            <tr key={index}>
              <td className="px-4 py-2 whitespace-nowrap">
                <input
                  type="text"
                  value={item.item}
                  onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                  className="border rounded px-2 py-1 w-16"
                />
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <input
                  type="number"
                  value={item.unitCost}
                  onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value))}
                  className="border rounded px-2 py-1 w-24"
                />
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={item.gstApplicable}
                  onChange={(e) => handleItemChange(index, 'gstApplicable', e.target.checked)}
                  className="rounded"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={addItem}
        className="mt-2 text-sm text-indigo-600 hover:underline"
      >
        + Add Item
      </button>
      <button
        onClick={calculateBudget}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Calculate Budget
      </button>
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>GST (18%):</span>
          <span>₹{gst.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Grand Total:</span>
          <span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default BudgetTable;