# 部署说明 (Linux 宝塔面板)

## 1. 上传文件
将 `huaneng` 文件夹内的所有内容上传到服务器目录，例如 `/www/wwwroot/huaneng`。

## 2. 宝塔面板设置 (Node.js 项目)

1.  **添加 Node 项目**:
    - **项目目录**: `/www/wwwroot/huaneng` (您上传的目录)
    - **启动选项**: 选择 `app.js`
    - **项目名称**: `huaneng` (随意)
    - **端口**: `6666` (默认后端端口)
    - **运行用户**: `www`
    - **Node 版本**: 建议 v18+ (本项目使用 Vite 构建，建议较高版本)

2.  **绑定域名/IP**:
    - 在域名管理中添加: `10.176.3.63` (或者您的服务器 IP/域名)

3.  **外网映射**:
    - 如果您希望通过 80 端口直接访问 (如 `http://10.176.3.63`)，请确保在宝塔中勾选 "映射" 或配置 Nginx 反向代理。
    - 宝塔会自动生成 Nginx 配置代理到 `http://127.0.0.1:6666`。

## 3. Nginx 配置 (静态文件优化 - 推荐)
默认情况下，Node 服务也会处理静态文件，但使用 Nginx 直接服务 `dist` 目录性能更好且更稳定。

在宝塔网站设置 -> **配置文件** (Nginx) 中，可以将 `location /` 部分修改为：

```nginx
server {
    listen 80;
    server_name 10.176.3.63;
    
    # 前端静态文件 (dist 目录)
    location / {
        root /www/wwwroot/huaneng/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 接口
    location /api {
        proxy_pass http://127.0.0.1:6666;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 上传文件目录
    location /uploads {
        proxy_pass http://127.0.0.1:6666;
    }
}
```

## 4. 常见问题
- **无法访问**: 检查服务器防火墙是否放行了 80 或 6666 端口。
- **数据库**: 数据存储在 `server/data/app.db`，部署包中已包含您本地的数据库文件（含用户角色配置）。
- **更新**: 如需更新前端，只需替换 `dist` 文件夹；如需更新后端，替换 `server` 文件夹并重启 Node 服务。
