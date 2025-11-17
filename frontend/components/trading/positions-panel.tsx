"use client";

interface Position {
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number;
  margin: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
}

interface Order {
  symbol: string;
  side: "buy" | "sell";
  type: "limit" | "market";
  price: number;
  amount: number;
  filled: number;
  status: "open" | "partial" | "filled" | "cancelled";
  time: string;
}

interface PositionsPanelProps {
  mode: "spot" | "perpetual";
  activeTab: "positions" | "orders" | "history";
  setActiveTab: (tab: "positions" | "orders" | "history") => void;
}

export function PositionsPanel({
  mode,
  activeTab,
  setActiveTab,
}: PositionsPanelProps) {
  // Mock data
  const positions: Position[] =
    mode === "perpetual"
      ? [
          {
            symbol: "NARUTO/USDC",
            side: "long",
            size: 100,
            entryPrice: 37.5,
            markPrice: 37.706,
            liquidationPrice: 30.2,
            margin: 375,
            leverage: 10,
            pnl: 20.6,
            pnlPercent: 5.49,
          },
        ]
      : [];

  const orders: Order[] = [
    {
      symbol: "ONEPIECE/USDC",
      side: "buy",
      type: "limit",
      price: 45.2,
      amount: 50,
      filled: 0,
      status: "open",
      time: "14:23:45",
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="border-b border-zinc-800 flex items-center px-4">
        <button
          onClick={() => setActiveTab("positions")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "positions"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          Positions {positions.length > 0 && `(${positions.length})`}
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "orders"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          Open Orders {orders.length > 0 && `(${orders.length})`}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          Order History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "positions" && mode === "perpetual" && (
          <div className="p-4">
            {positions.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                <div className="text-4xl mb-2">📊</div>
                <div>No open positions</div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="text-left pb-2">Symbol</th>
                    <th className="text-left pb-2">Side</th>
                    <th className="text-right pb-2">Size</th>
                    <th className="text-right pb-2">Entry Price</th>
                    <th className="text-right pb-2">Mark Price</th>
                    <th className="text-right pb-2">Liq. Price</th>
                    <th className="text-right pb-2">Margin</th>
                    <th className="text-center pb-2">Leverage</th>
                    <th className="text-right pb-2">PnL</th>
                    <th className="text-center pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position, index) => (
                    <tr
                      key={index}
                      className="border-b border-zinc-800/50 hover:bg-zinc-900/30"
                    >
                      <td className="py-3 text-white font-medium">
                        {position.symbol}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            position.side === "long"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {position.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-right text-zinc-300">
                        {position.size}
                      </td>
                      <td className="py-3 text-right text-zinc-300">
                        ${position.entryPrice.toFixed(3)}
                      </td>
                      <td className="py-3 text-right text-zinc-300">
                        ${position.markPrice.toFixed(3)}
                      </td>
                      <td className="py-3 text-right text-zinc-300">
                        ${position.liquidationPrice.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-zinc-300">
                        ${position.margin.toFixed(2)}
                      </td>
                      <td className="py-3 text-center text-cyan-400">
                        {position.leverage}x
                      </td>
                      <td className="py-3 text-right">
                        <div
                          className={
                            position.pnl >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          ${position.pnl.toFixed(2)}
                        </div>
                        <div
                          className={`text-xs ${
                            position.pnl >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {position.pnl >= 0 ? "+" : ""}
                          {position.pnlPercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <button className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs">
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "positions" && mode === "spot" && (
          <div className="text-center text-zinc-500 py-8">
            <div className="text-4xl mb-2">💼</div>
            <div>Spot trading doesn&apos;t have positions</div>
            <div className="text-xs mt-2">
              Check your portfolio for balances
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="p-4">
            {orders.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                <div className="text-4xl mb-2">📋</div>
                <div>No open orders</div>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="text-left pb-2">Time</th>
                    <th className="text-left pb-2">Symbol</th>
                    <th className="text-left pb-2">Type</th>
                    <th className="text-left pb-2">Side</th>
                    <th className="text-right pb-2">Price</th>
                    <th className="text-right pb-2">Amount</th>
                    <th className="text-right pb-2">Filled</th>
                    <th className="text-center pb-2">Status</th>
                    <th className="text-center pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr
                      key={index}
                      className="border-b border-zinc-800/50 hover:bg-zinc-900/30"
                    >
                      <td className="py-3 text-zinc-400">{order.time}</td>
                      <td className="py-3 text-white font-medium">
                        {order.symbol}
                      </td>
                      <td className="py-3 text-zinc-300 uppercase">
                        {order.type}
                      </td>
                      <td className="py-3">
                        <span
                          className={
                            order.side === "buy"
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {order.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-right text-zinc-300">
                        ${order.price.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-zinc-300">
                        {order.amount}
                      </td>
                      <td className="py-3 text-right text-zinc-300">
                        {order.filled}
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400">
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <button className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs">
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="text-center text-zinc-500 py-8">
            <div className="text-4xl mb-2">📜</div>
            <div>No order history</div>
          </div>
        )}
      </div>
    </div>
  );
}
