import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3Context } from '../context/Web3Context';
import TokenSelector from './TokenSelector';
import { Token, parseAmount, formatAmount } from '../utils/tokens';
import { usePair } from '../hooks/usePair';
import { TEST_TOKENS, WETH_ADDRESS } from '../constants/addresses';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { ReservesCurve } from './ReservesCurve';
import { PriceDistributionChart } from './PriceDistributionChart';
import { SwapRoute } from './SwapRoute';
import { findBestPath, getAmountsForPath, calculateMultiHopPriceImpact } from '../utils/pathFinder';
import { SwapPriceDistribution } from './SwapPriceDistribution';

// Add a utility function at the top of the file to help with gas estimation
const getGasSettings = (isEstimationFailed = false) => {
  return {
    gasLimit: isEstimationFailed ? 1000000 : 500000, // Increased gas limits
    gasPrice: ethers.utils.parseUnits(isEstimationFailed ? "150" : "100", "gwei")
  };
};

export const Swap: React.FC = () => {
  const { account, routerContract, isConnected, signer, provider, connectWallet } = useWeb3Context();
  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [swapDirection, setSwapDirection] = useState<'exactIn' | 'exactOut'>('exactIn');
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStatus, setSwapStatus] = useState<'idle' | 'approving' | 'estimating' | 'retrying' | 'swapping' | 'success'>('idle');
  const [priceImpact, setPriceImpact] = useState<number | null>(null);

  // Add manual update flags to prevent unwanted state resets
  const [manualInputUpdate, setManualInputUpdate] = useState(false);
  const [manualOutputUpdate, setManualOutputUpdate] = useState(false);

  // Get pair information if both tokens are selected
  const { pair, exists: pairExists } = usePair(
    tokenIn?.address || '',
    tokenOut?.address || ''
  );

  // Get token balances
  const { balance: balanceIn } = useTokenBalance(tokenIn?.address || null);
  const { balance: balanceOut } = useTokenBalance(tokenOut?.address || null);

  // Initialize with some test tokens
  useEffect(() => {
    if (TEST_TOKENS.length >= 2) {
      setTokenIn(TEST_TOKENS[0]);
      setTokenOut(TEST_TOKENS[1]);
    }
  }, []);

  // Debug log when tokens or pair changes
  useEffect(() => {
    console.log("Token or pair state changed:", {
      tokenIn: tokenIn?.address,
      tokenOut: tokenOut?.address,
      pairExists,
      pairAddress: pair?.address,
      reserves: pair ? {
        reserve0: pair.reserves.reserve0.toString(),
        reserve1: pair.reserves.reserve1.toString()
      } : null
    });
  }, [tokenIn, tokenOut, pair, pairExists]);

  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setInputAmount(outputAmount);
    setOutputAmount(inputAmount);
    setSwapDirection(swapDirection === 'exactIn' ? 'exactOut' : 'exactIn');
  };

  const calculateOutput = useCallback(async () => {
    if (
      !routerContract ||
      !tokenIn ||
      !tokenOut ||
      !inputAmount ||
      inputAmount === '0' ||
      !provider
    ) {
      if (manualOutputUpdate || inputAmount === '') {
        return;
      }
      setOutputAmount('');
      return;
    }

    try {
      const amountIn = parseAmount(inputAmount, tokenIn.decimals);
      
      // Find the best path
      const path = await findBestPath(tokenIn, tokenOut, provider);
      setCurrentPath(path);
      
      // Get amounts for the path using router contract
      const pathAddresses = path.map(token => 
        token.address === "ETH" ? WETH_ADDRESS : token.address
      );
      
      const amounts = await routerContract.getAmountsOut(amountIn, pathAddresses);
      const amountOut = amounts[amounts.length - 1];
      
      // Format the output amount
      const formattedOutput = formatAmount(amountOut.toString(), tokenOut.decimals);
      setOutputAmount(formattedOutput);
      
      // Set formatted amounts for display with proper TypeScript types
      const formattedAmounts = amounts.map((amount: ethers.BigNumber, index: number) => 
        formatAmount(amount.toString(), path[index].decimals)
      );
      setPathAmounts(formattedAmounts);
      
      // Calculate price impact
      const impact = await calculateMultiHopPriceImpact(pathAddresses, amountIn, amountOut, provider);
      setPriceImpact(impact);

      // Debug log
      console.log('Swap calculation:', {
        inputAmount,
        amountIn: amountIn.toString(),
        amountOut: amountOut.toString(),
        formattedOutput,
        impact
      });
    } catch (error) {
      console.error('Error calculating output:', error);
      setOutputAmount('');
    }
  }, [routerContract, tokenIn, tokenOut, inputAmount, provider, manualOutputUpdate]);

  const calculateInput = useCallback(async () => {
    if (
      !routerContract ||
      !tokenIn ||
      !tokenOut ||
      !outputAmount ||
      outputAmount === '0' ||
      !pairExists
    ) {
      // Don't reset inputAmount if we're not explicitly calculating
      if (manualInputUpdate || outputAmount === '') {
        return;
      }
      setInputAmount('');
      return;
    }

    // Skip calculation if the user is manually entering both values
    if (manualInputUpdate) {
      return;
    }

    try {
      const amountOut = parseAmount(outputAmount, tokenOut.decimals);
      
      // Get the input amount
      const path = [tokenIn.address, tokenOut.address];
      
      const amounts = await routerContract.getAmountsIn(amountOut, path);
      const amountIn = amounts[0];
      
      setInputAmount(formatAmount(amountIn.toString(), tokenIn.decimals));
      
      // Calculate price impact
      if (pair) {
        let reserve0 = pair.reserves.reserve0;
        let reserve1 = pair.reserves.reserve1;
        
        // Make sure reserves match the token order
        if (tokenIn.address.toLowerCase() !== pair.token0.address.toLowerCase()) {
          [reserve0, reserve1] = [reserve1, reserve0];
        }
        
        // Calculate price impact
        const impact = calculatePriceImpact(reserve0, reserve1, amountIn);
        setPriceImpact(impact);
      }
    } catch (error) {
      console.error('Error calculating input:', error);
      // Don't clear input if there's an error - keep existing value
    }
  }, [routerContract, tokenIn, tokenOut, outputAmount, pairExists, pair, manualInputUpdate]);

  // Calculate price impact
  const calculatePriceImpact = (reserveIn: ethers.BigNumber, reserveOut: ethers.BigNumber, amountIn: ethers.BigNumber): number => {
    // Using the constant product formula: x * y = k
    // Calculate the new reserves after the swap
    const amountInWithFee = amountIn.mul(997); // 0.3% fee
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(1000).add(amountInWithFee);
    const newAmountOut = numerator.div(denominator);
    
    // Calculate spot price (price before swap)
    const spotPrice = reserveIn.mul(ethers.utils.parseUnits('1', 18)).div(reserveOut);
    
    // Calculate execution price (price including the swap)
    const executionPrice = amountIn.mul(ethers.utils.parseUnits('1', 18)).div(newAmountOut);
    
    // Calculate price impact as a percentage
    const impact = executionPrice.sub(spotPrice).mul(10000).div(spotPrice).toNumber() / 100;
    
    return impact;
  };

  // Effect to trigger calculation when values change
  useEffect(() => {
    // Only calculate if we have all necessary data
    if (tokenIn && tokenOut && pairExists) {
      if (swapDirection === 'exactIn' && inputAmount && !manualOutputUpdate) {
        calculateOutput();
      } else if (swapDirection === 'exactOut' && outputAmount && !manualInputUpdate) {
        calculateInput();
      }
    }
  }, [
    swapDirection, 
    calculateOutput, 
    calculateInput, 
    tokenIn, 
    tokenOut, 
    inputAmount, 
    outputAmount,
    pairExists,
    manualInputUpdate,
    manualOutputUpdate
  ]);

  // Reset manual flags when tokens change
  useEffect(() => {
    setManualInputUpdate(false);
    setManualOutputUpdate(false);
  }, [tokenIn, tokenOut]);

  const handleInputChange = (value: string) => {
    console.log("Input changed:", value);
    setInputAmount(value);
    setManualInputUpdate(false);
    setManualOutputUpdate(false);
    
    if (value) {
      setSwapDirection('exactIn');
    }
  };

  const handleOutputChange = (value: string) => {
    setOutputAmount(value);
    setManualInputUpdate(false);
    setManualOutputUpdate(false);
    
    if (value) {
      setSwapDirection('exactOut');
    }
  };

  const handleApprove = async () => {
    if (!tokenIn || !account || !routerContract || !signer) return;
    
    try {
      setIsApproving(true);
      setSwapStatus('approving');
      
      // Get ERC20 contract
      const erc20Contract = new ethers.Contract(
        tokenIn.address,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      );
      
      // Approve
      const tx = await erc20Contract.approve(
        routerContract.address,
        ethers.constants.MaxUint256
      );
      
      await tx.wait();
      
    } catch (error) {
      console.error('Error approving token:', error);
    } finally {
      setIsApproving(false);
      setSwapStatus('idle');
    }
  };

  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !account) {
      console.log("Missing tokens or account", { tokenIn, tokenOut, account });
      return;
    }
    
    if (!routerContract || !provider) {
      console.log("Router contract is null - reconnecting wallet");
      alert("Connection to the network is not established. Please reconnect your wallet.");
      await connectWallet();
      return;
    }
    
    try {
      setIsSwapping(true);
      setSwapStatus('estimating');
      
      const isEthIn = tokenIn.address === "ETH";
      const isEthOut = tokenOut.address === "ETH";
      
      // Find the best path
      const path = await findBestPath(tokenIn, tokenOut, provider);
      const pathAddresses = path.map(token => 
        token.address === "ETH" ? WETH_ADDRESS : token.address
      );
      
      console.log("Swap function called:", swapDirection === 'exactIn' ? 'swapExactTokensForTokens' : 'swapTokensForExactTokens');
      
      // Parse amounts based on swap direction
      let amountIn, amountInMax, amountOut, amountOutMin;
      if (swapDirection === 'exactIn') {
        amountIn = parseAmount(inputAmount, tokenIn.decimals);
        amountOutMin = parseAmount(
          (parseFloat(outputAmount) * 0.95).toString(), // 5% slippage
          tokenOut.decimals
        );
      } else {
        amountOut = parseAmount(outputAmount, tokenOut.decimals);
        amountInMax = parseAmount(
          (parseFloat(inputAmount) * 1.05).toString(), // 5% slippage
          tokenIn.decimals
        );
      }
      
      console.log("Swap amounts:", {
        direction: swapDirection,
        amountIn: amountIn?.toString(),
        amountInMax: amountInMax?.toString(),
        amountOut: amountOut?.toString(),
        amountOutMin: amountOutMin?.toString()
      });

      // Get initial gas settings
      let overrides = getGasSettings();
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      
      try {
        // Check approval first if not ETH
        if (!isEthIn && signer) {
          const tokenContract = new ethers.Contract(
            tokenIn.address,
            ['function allowance(address,address) view returns (uint256)'],
            signer
          );
          const allowance = await tokenContract.allowance(account, routerContract.address);
          const requiredAmount = swapDirection === 'exactIn' ? amountIn : amountInMax;
          if (allowance.lt(requiredAmount)) {
            await handleApprove();
          }
        }

        let tx;
        
        if (swapDirection === 'exactIn') {
          // Exact input swaps
          if (isEthIn) {
            tx = await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens(
              amountOutMin,
              pathAddresses,
              account,
              deadline,
              { 
                ...overrides,
                value: amountIn 
              }
            );
          } else if (isEthOut) {
            tx = await routerContract.swapExactTokensForETHSupportingFeeOnTransferTokens(
              amountIn,
              amountOutMin,
              pathAddresses,
              account,
              deadline,
              overrides
            );
          } else {
            tx = await routerContract.swapExactTokensForTokensSupportingFeeOnTransferTokens(
              amountIn,
              amountOutMin,
              pathAddresses,
              account,
              deadline,
              overrides
            );
          }
        } else {
          // Exact output swaps
          if (isEthIn) {
            tx = await routerContract.swapETHForExactTokens(
              amountOut,
              pathAddresses,
              account,
              deadline,
              { 
                ...overrides,
                value: amountInMax 
              }
            );
          } else if (isEthOut) {
            tx = await routerContract.swapTokensForExactETH(
              amountOut,
              amountInMax,
              pathAddresses,
              account,
              deadline,
              overrides
            );
          } else {
            tx = await routerContract.swapTokensForExactTokens(
              amountOut,
              amountInMax,
              pathAddresses,
              account,
              deadline,
              overrides
            );
          }
        }
        
        setSwapStatus('swapping');
        await tx.wait();
        setSwapStatus('success');
        
      } catch (error: any) {
        console.error("Swap error:", error);
        
        if (error.message.includes("gas") || error.message.includes("estimate")) {
          console.log("Retrying with higher gas...");
          setSwapStatus('retrying');
          
          // Retry with higher gas and 10% more slippage
          overrides = getGasSettings(true);
          
          if (swapDirection === 'exactIn') {
            if (!amountOutMin) return;
            const newAmountOutMin = amountOutMin.mul(90).div(100);
            if (isEthIn) {
              await routerContract.swapExactETHForTokensSupportingFeeOnTransferTokens(
                newAmountOutMin,
                pathAddresses,
                account,
                deadline,
                { 
                  ...overrides,
                  value: amountIn 
                }
              );
            }
          } else {
            if (!amountInMax || !amountOut) return;
            const newAmountInMax = amountInMax.mul(110).div(100);
            if (isEthIn) {
              await routerContract.swapETHForExactTokens(
                amountOut,
                pathAddresses,
                account,
                deadline,
                { 
                  ...overrides,
                  value: newAmountInMax 
                }
              );
            }
          }
          throw new Error("Please try again with a smaller amount or more slippage tolerance");
        } else if (error.message.includes("INSUFFICIENT_OUTPUT_AMOUNT")) {
          throw new Error("Price impact too high. Try a smaller trade size.");
        } else {
          throw error;
        }
      }
      
    } catch (error: any) {
      console.error("Final error:", error);
      alert(error.message || "Swap failed. Please try again with different parameters.");
      setSwapStatus('idle');
    } finally {
      setIsSwapping(false);
    }
  };

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet';
    if (!routerContract) return 'Network Connection Issue';
    if (!tokenIn || !tokenOut) return 'Select Tokens';
    if (!inputAmount || !outputAmount) return 'Enter Amount';
    
    if (swapStatus === 'approving') return 'Approving...';
    if (swapStatus === 'estimating') return 'Estimating Gas...';
    if (swapStatus === 'retrying') return 'Retrying with Higher Gas...';
    if (swapStatus === 'swapping') return 'Swapping...';
    
    // Special cases for direct conversions
    if (tokenIn.address === "ETH" && tokenOut.address === WETH_ADDRESS) return 'Wrap ETH';
    if (tokenIn.address === WETH_ADDRESS && tokenOut.address === "ETH") return 'Unwrap ETH';
    return 'Swap';
  };

  // Add state for path and amounts
  const [currentPath, setCurrentPath] = useState<Token[]>([]);
  const [pathAmounts, setPathAmounts] = useState<string[]>([]);

  return (
    <div className="space-y-10 px-6 pt-6 max-w-4xl mx-auto">
      <div className="rounded-2xl border border-gray-800 bg-black shadow-md p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold text-white">Swap Tokens</h2>
        </div>
  
        <div className="space-y-4">
          {/* Input */}
          <div className="bg-gray-950 p-4 rounded-xl">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>You pay</span>
              {tokenIn && <span>Balance: {formatAmount(balanceIn.toString(), tokenIn.decimals)}</span>}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                className="bg-transparent text-white text-xl flex-1 focus:outline-none"
                placeholder="0.0"
                value={inputAmount}
                onChange={(e) => handleInputChange(e.target.value)}
              />
              <div className="bg-gray-800 rounded-xl px-3 py-2">
                <TokenSelector
                  selectedToken={tokenIn}
                  onSelectToken={setTokenIn}
                  otherSelectedToken={tokenOut}
                  label="You pay"
                />
              </div>
            </div>
          </div>
  
          {/* Switch Button */}
          <div className="flex justify-center">
            <button
              className="bg-gray-900 p-2 rounded-full border border-gray-700 hover:border-white hover:scale-110 transition-transform"
              onClick={switchTokens}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
              </svg>
            </button>
          </div>
  
          {/* Output */}
          <div className="bg-gray-950 p-4 rounded-xl">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>You receive</span>
              {tokenOut && <span>Balance: {formatAmount(balanceOut.toString(), tokenOut.decimals)}</span>}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                className="bg-transparent text-white text-xl flex-1 focus:outline-none"
                placeholder="0.0"
                value={outputAmount}
                onChange={(e) => handleOutputChange(e.target.value)}
              />
              <div className="bg-gray-800 rounded-xl px-3 py-2">
                <TokenSelector
                  selectedToken={tokenOut}
                  onSelectToken={setTokenOut}
                  otherSelectedToken={tokenIn}
                  label="You receive"
                />
              </div>
            </div>
          </div>
  
          {/* Route Display */}
          {currentPath.length > 0 && (
            <div className="bg-gray-900 p-3 rounded-xl">
              <SwapRoute path={currentPath} amounts={pathAmounts} />
            </div>
          )}
  
          {/* Price Info */}
          {tokenIn && tokenOut && inputAmount && outputAmount && (
            <div className="bg-gray-900 p-4 rounded-xl text-sm text-gray-300 space-y-2">
              <div className="flex justify-between">
                <span>Rate</span>
                <span className="text-white font-medium">
                  {(() => {
                    const isEthIn = tokenIn.address === "ETH";
                    const isEthOut = tokenOut.address === "ETH";
                    if (isEthIn && tokenOut.address === WETH_ADDRESS) return '1 ETH = 1 WETH';
                    if (isEthOut && tokenIn.address === WETH_ADDRESS) return '1 WETH = 1 ETH';
                    const amountInBN = parseAmount(inputAmount, tokenIn.decimals);
                    const amountOutBN = parseAmount(outputAmount, tokenOut.decimals);
                    if (amountInBN && amountOutBN && !amountInBN.isZero()) {
                      const scaleFactor = ethers.BigNumber.from(10).pow(18);
                      const price = amountOutBN.mul(scaleFactor).div(amountInBN);
                      return `1 ${tokenIn.symbol} = ${formatAmount(price.toString(), 18)} ${tokenOut.symbol}`;
                    }
                    return `1 ${tokenIn.symbol} = 0.00 ${tokenOut.symbol}`;
                  })()}
                </span>
              </div>
              {priceImpact !== null && (() => {
                const isEthIn = tokenIn.address === "ETH";
                const isEthOut = tokenOut.address === "ETH";
                return !(isEthIn && tokenOut.address === WETH_ADDRESS) && !(isEthOut && tokenIn.address === WETH_ADDRESS);
              })() && (
                <div className="flex justify-between">
                  <span>Price Impact</span>
                  <span className={`font-semibold ${priceImpact > 5 ? 'text-red-500' : priceImpact > 1 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
  
          {/* Submit Button */}
          <button
            className={`w-full py-4 mt-4 rounded-xl font-medium transition-all duration-300 text-white text-lg ${
              !isConnected || !tokenIn || !tokenOut || !inputAmount || !outputAmount
                ? 'bg-gray-700 cursor-not-allowed'
                : swapStatus === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : swapStatus === 'retrying'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-gray-800 hover:bg-gray-700'
            }`}
            disabled={!isConnected || !tokenIn || !tokenOut || !inputAmount || !outputAmount || isApproving || isSwapping}
            onClick={isConnected ? handleSwap : () => {}}
          >
            {getButtonText()}
          </button>
        </div>
  
        {tokenIn && tokenOut && pair && provider && (
          <div className="space-y-10">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Reserves Curve</h3>
              <div className="bg-gray-950 rounded-2xl p-6">
                <ReservesCurve
                  token0={tokenIn}
                  token1={tokenOut}
                  reserve0={pair.reserves.reserve0}
                  reserve1={pair.reserves.reserve1}
                />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Historical Swap Prices</h3>
              <div className="bg-gray-950 rounded-2xl p-6">
                <SwapPriceDistribution
                  token0={tokenIn}
                  token1={tokenOut}
                  pairAddress={pair.address}
                  provider={provider}
                />
              </div>
            </div>
          </div>
        )}
    </div>
    </div>
  );
}; 