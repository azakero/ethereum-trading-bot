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
const etherToGwei = (amount) => {
  return ethers.utils.parseUnits(amount, "gwei");
}

// amount = 5000000 GWEI
const gweiToEther = (amount) => {
  return ethers.utils.formatUnits(amount, "gwei");
}

module.exports = {
  fromReadableAmount,
  etherToWei,
  weiToEther,
  etherToGwei,
  gweiToEther,
}