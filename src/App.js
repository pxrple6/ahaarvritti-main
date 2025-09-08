import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { DonationProvider } from './contexts/DonationContext';
import { NotificationProvider } from './contexts/NotificationContext';

import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';

import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import DonationPage from './pages/Donation/DonationPage';
import RequestPage from './pages/Request/RequestPage';
import ProfilePage from './pages/Profile/ProfilePage.js';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import NotificationPage from './pages/Notification/NotificationPage';
import ChatbotPage from './pages/Chatbot/ChatbotPage';


import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <DonationProvider>
        <NotificationProvider>
          <Router>
            <div className="App">
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
              
              <Routes>
                {}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/donations" element={
                  <ProtectedRoute>
                    <Layout>
                      <DonationPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/requests" element={
                  <ProtectedRoute>
                    <Layout>
                      <RequestPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <Layout>
                      <AnalyticsPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <Layout>
                      <NotificationPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/chatbot" element={
                  <ProtectedRoute>
                    <Layout>
                      <ChatbotPage />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                {}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </NotificationProvider>
      </DonationProvider>
    </AuthProvider>
  );
}

export default App;