import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ConfigProvider from 'antd/es/config-provider';
import zhCN from 'antd/locale/zh_CN';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<div>登录页面（待实现）</div>} />
          <Route path="/register" element={<div>注册页面（待实现）</div>} />
          <Route path="/dashboard" element={<div>仪表盘页面（待实现）</div>} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
