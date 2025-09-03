# 1. 選擇一個官方的 Node.js 執行環境作為基礎映像檔
# 建議使用 LTS (長期支援) 版本，例如 'lts' 或指定版本 '18'
# Alpine 版本體積更小，適合用於生產環境
FROM node:18-alpine

# 2. 在容器內建立一個工作目錄來存放應用程式程式碼
WORKDIR /usr/src/app

# 3. 複製 package.json 和 package-lock.json (或 yarn.lock)
# 透過只複製這兩個檔案，可以利用 Docker 的快取機制
# 只有當這兩個檔案變更時，才會重新安裝依賴
COPY package*.json ./

# 4. 安裝專案依賴
# 如果你使用 npm
RUN npm install
# 如果你使用 yarn，請改用下面這行
# RUN yarn install

# 5. 複製專案的所有檔案到工作目錄
COPY . .

# 6. 向 Docker 聲明你的應用程式在哪個連接埠上運行
# 這並不會真的 "發布" 連接埠，只是作為一個文件紀錄
EXPOSE 3000

# 7. 定義啟動容器時要執行的指令
# 這通常是啟動你的 Node.js 應用程式的指令
CMD [ "node", "server.js" ]
# 如果你的啟動指令是 'npm start'，請改用下面這行
# CMD [ "npm", "start" ]