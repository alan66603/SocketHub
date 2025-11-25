function App() {
  return (
    // 這裡的 className 都是 Tailwind 的語法
    // h-screen: 高度佔滿整個螢幕
    // bg-gray-100: 背景是淺灰色
    // flex justify-center items-center:讓內容上下左右置中
    <div className="h-screen w-screen bg-gray-100 flex flex-col justify-center items-center">
      
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          SocketHub 啟動成功 🚀
        </h1>
        <p className="text-gray-500">
          Tailwind CSS 已經生效，準備開始做地圖！
        </p>
      </div>

    </div>
  )
}

export default App