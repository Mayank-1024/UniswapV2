// import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import { Web3Provider } from './context/Web3Context'
import { Header } from './components/Header'
import { Swap } from './components/Swap'
import { Pool } from './components/Pool'
import './App.css'

function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="relative min-h-screen overflow-hidden">
          
          {/* Content */}
          <div className="relative z-10">
            <Header />
            <main className="container mx-auto py-6 px-4 min-h-[calc(100vh-180px)]">
              <Routes>
                <Route path="/" element={<Swap />} />
                <Route path="/pool" element={<Pool />} />
                <Route path="/swap" element={<Swap />} />
              </Routes>
            </main>
            
            
          </div>
        </div>
      </Router>
    </Web3Provider>
  )
}

export default App
