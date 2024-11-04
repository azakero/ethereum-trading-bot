const 
  { ethers }          = require('ethers'),
  JSBI                = require('jsbi')
;

const fromReadableAmount = (amount, decimals) => {
  const extraDigits = Math.pow(10, countDecimals(amount));
  const adjustedAmount = amount * extraDigits;

  return JSBI.divide(
    JSBI.multiply(
      JSBI.BigInt(adjustedAmount),
      JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))
    ),
    JSBI.BigInt(extraDigits)
  )
}

const countDecimals = (x) => {
  if (Math.floor(x) === x) {
    return 0
  }
  return x.toString().split('.')[1].length || 0
}

// amount = 0.5 ETH
const etherToWei = (amount) => {
  return ethers.utils.parseEther(amount);
}

// amount = 1500000000000000000 WEI
const weiToEther = (amount) => {
  return ethers.utils.formatEther(amount)
}

// amount = 0.5 ETH
const etherToGwei = (amount, unitName = 'gwei') => {
  return ethers.utils.parseUnits(amount, unitName);
}

// amount = 5000000 GWEI
const gweiToEther = (amount, unitName = 'gwei') => {
  return ethers.utils.formatUnits(amount, unitName);
}

const getContract = (ca, abi, provider) => {
  return new ethers.Contract(ca, abi, provider)
}

const transactionCostIncurred = (transactionData) => {
  const 
    gasUsed           = transactionData.gasUsed,
    effectiveGasPrice = transactionData.effectiveGasPrice
  ;

  // this will return the cost in wei
  const transactionCost = gasUsed.mul(effectiveGasPrice); 

  return weiToEther(transactionCost);
}

const totalSwapCost = (transactionCostIncurred, wethAmount) => {
  return transactionCostIncurred + wethAmount;
}

module.exports = {
  fromReadableAmount,
  etherToWei,
  weiToEther,
  etherToGwei,
  gweiToEther,
  getContract,
  transactionCostIncurred,
  totalSwapCost
}