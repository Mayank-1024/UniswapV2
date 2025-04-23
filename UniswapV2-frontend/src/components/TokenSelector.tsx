import React, { useState, useEffect, useCallback } from 'react';
import { TEST_TOKENS, WETH_ADDRESS } from '../constants/addresses';
import { Token } from '../utils/tokens';

interface TokenSelectorProps {
  selectedToken: Token | null;
  onSelectToken: (token: Token | null) => void;
  otherSelectedToken: Token | null;
  className?: string;
  label?: string;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onSelectToken,
  otherSelectedToken,
  className = '',
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState<Token[]>(TEST_TOKENS);

  // Memoize the filter function to improve performance
  const filterTokens = useCallback((query: string) => {
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    return TEST_TOKENS.filter(token => {
      // Skip the other selected token
      if (token.address === otherSelectedToken?.address) {
        return false;
      }

      // Check if all search terms match either symbol, name, or address
      return searchTerms.every(term =>
        token.symbol.toLowerCase().includes(term) ||
        token.name.toLowerCase().includes(term) ||
        token.address.toLowerCase().includes(term)
      );
    });
  }, [otherSelectedToken]);

  // Update filtered tokens when search query changes
  useEffect(() => {
    const filtered = searchQuery ? filterTokens(searchQuery) : TEST_TOKENS.filter(
      token => token.address !== otherSelectedToken?.address
    );
    setFilteredTokens(filtered);
  }, [searchQuery, filterTokens]);

  const handleTokenSelect = (token: Token) => {
    onSelectToken(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-400 mb-1 px-1">
          {label}
        </label>
      )}
      <button
        type="button"
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#1A1A1A] border border-gray-700 hover:border-gray-500 text-white focus:outline-none transition-all duration-200 ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedToken ? (
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7">
              <img
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                className="w-7 h-7 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="absolute inset-0 hidden bg-gray-700 text-white text-xs flex items-center justify-center rounded-full">
                {selectedToken.symbol.charAt(0)}
              </div>
            </div>
            <span className="text-sm">{selectedToken.symbol}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">Select a token</span>
        )}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
  
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-sm mx-4 animate-fade-in-up bg-[#111111] rounded-xl border border-gray-800 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Select a token</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Search name, symbol, or paste address"
                className="w-full px-3 py-2 rounded-xl text-sm bg-[#1E1E1E] border border-gray-700 placeholder-gray-500 text-white focus:outline-none focus:border-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <div className="mt-3 max-h-60 overflow-y-auto custom-scroll">
                {filteredTokens.map((token) => (
                  <button
                    key={token.address}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#222] transition focus:outline-none"
                    onClick={() => handleTokenSelect(token)}
                  >
                    <div className="relative w-7 h-7">
                      <img
                        src={token.logoURI}
                        alt={token.symbol}
                        className="w-7 h-7 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="absolute inset-0 hidden bg-gray-700 text-white text-xs flex items-center justify-center rounded-full">
                        {token.symbol.charAt(0)}
                      </div>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="flex items-center px-3 py-1.5 hover:bg-dark rounded-md transition">{token.symbol}</span>
                      <span className="text-xs text-gray-400">{token.name}</span>
                    </div>
                  </button>
                ))}
                {filteredTokens.length === 0 && (
                  <div className="text-center text-gray-500 text-xs py-3">
                    No results for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );  
};

export default TokenSelector;