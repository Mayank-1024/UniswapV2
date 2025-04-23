import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3Context } from '../context/Web3Context';

const UNI_LOGO_URL = 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png';

export const Header = () => {
  const { account, disconnectWallet, connectWallet } = useWeb3Context();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNavLinkClass = (path: string) => {
    return `px-5 py-2 rounded-lg transition-all duration-200 font-medium text-md ${
      isActive(path)
        ? 'bg-zinc-800 text-white shadow-md'
        : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
    }`;
  };

  return (
    <>
      <div className="h-[100px]" />

      <div className="fixed top-0 left-0 right-0 z-50 px-6 pt-4">
        <header className="mx-auto max-w-7xl rounded-xl border border-zinc-800/50 backdrop-blur-lg bg-zinc-900/60 shadow-lg transition-shadow duration-300">
          <div className="px-8 py-4">
            <nav className="flex justify-center items-center gap-20 px-6 py-3 bg-dark text-white shadow-md">
              
              <div className="flex items-center gap-12">
                <Link to="/" className="flex items-center gap-3 group">
                 
                  <span className="text-2xl font-bold text-white tracking-wide">
                    Mayank Uniswap V2
                  </span>
                </Link>

                <div className="flex gap-4">
                  <Link to="/pool" className={getNavLinkClass('/pool')}>Pool</Link>
                  <Link to="/swap" className={getNavLinkClass('/swap')}>Swap</Link>
                </div>
              </div>

              {/* Wallet */}
              <div className="flex items-center gap-4">
                {account ? (
                  <>
                    <div className="px-4 py-2 rounded-md bg-zinc-800 text-gray-200 font-mono text-sm border border-zinc-700">
                      {formatAddress(account)}
                    </div>
                    <button
                      onClick={disconnectWallet}
                      className="px-4 py-2 bg-zinc-800 text-red-400 border border-red-500/40 rounded-md hover:bg-red-900/40 transition"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="px-5 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            </nav>
          </div>
        </header>
      </div>
    </>
  );
};
