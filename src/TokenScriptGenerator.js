import React, { useState } from 'react';
import { ethers } from 'ethers';

const networks = [
  { name: 'Ethereum Mainnet', chainId: 1, rpcUrl: 'https://mainnet.infura.io/v3/9e5f595ea96948429ef80c8924526540', etherscanApi: 'https://api.etherscan.io/api' },
  { name: 'Goerli Testnet', chainId: 5, rpcUrl: 'https://goerli.infura.io/v3/9e5f595ea96948429ef80c8924526540', etherscanApi: 'https://api-goerli.etherscan.io/api' },
];

const ETHERSCAN_API_KEY = 'QRVS1S4PQ2GXRQKDJMQHPTA5H6548FCW6Q';

const TokenScriptGenerator = () => {
  const [network, setNetwork] = useState(networks[0]);
  const [contractAddress, setContractAddress] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenScript, setTokenScript] = useState('');
  const [error, setError] = useState('');

  const fetchABI = async (address) => {
    const url = `${network.etherscanApi}?module=contract&action=getabi&address=${address}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === '1') {
      return JSON.parse(data.result);
    } else {
      throw new Error('Failed to fetch ABI: ' + data.result);
    }
  };

  const generateTokenScript = async () => {
    try {
      setError('');
      setTokenScript('');

      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const abi = await fetchABI(contractAddress);
      const contract = new ethers.Contract(contractAddress, abi, provider);

      let name = tokenName;
      let symbol = tokenSymbol;

      try {
        if (!name && contract.name) name = await contract.name();
      } catch (nameError) {
        console.log('Error fetching name:', nameError);
      }

      try {
        if (!symbol && contract.symbol) symbol = await contract.symbol();
      } catch (symbolError) {
        console.log('Error fetching symbol:', symbolError);
      }

      if (!name || !symbol) {
        throw new Error('Unable to fetch token name or symbol. Please input them manually.');
      }

      const functions = abi.filter(item => item.type === 'function');
      const tokenScriptXml = generateTokenScriptXml(name, symbol, contractAddress, network.chainId, functions);

      setTokenScript(tokenScriptXml);
    } catch (err) {
      setError('Error generating TokenScript: ' + err.message);
    }
  };

  const generateTokenScriptXml = (name, symbol, address, chainId, functions) => {
    return `
<?xml version="1.0" encoding="UTF-8"?>
<ts:token xmlns:ts="http://tokenscript.org/2020/06/tokenscript"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://tokenscript.org/2020/06/tokenscript http://tokenscript.org/2020/06/tokenscript.xsd"
          custodian="false">
  <ts:name>
    <ts:string xml:lang="en">${name}</ts:string>
  </ts:name>
  <ts:contract interface="erc20" name="${name}">
    <ts:address network="${chainId}">${address}</ts:address>
  </ts:contract>
  <ts:origins>
    <ts:ethereum contract="${address}"/>
  </ts:origins>
  
  ${functions.map(func => generateCardForFunction(func)).join('\n')}
</ts:token>
    `.trim();
  };

  const generateCardForFunction = (func) => {
    return `
  <ts:card type="action">
    <ts:label>
      <ts:string xml:lang="en">${func.name}</ts:string>
    </ts:label>
    <ts:attribute name="function">
      <ts:type>
        <ts:syntax>bytes24</ts:syntax>
      </ts:type>
      <ts:origins>
        <ts:ethereum function="${func.name}" as="bytes24"/>
      </ts:origins>
    </ts:attribute>
    ${func.inputs.map(input => generateOriginForInput(input)).join('\n')}
    <ts:transaction>
      <ts:ethereum function="${func.name}"/>
    </ts:transaction>
    <ts:view xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
      <style type="text/css">.ts-action { font-family: sans-serif; }</style>
      <div class="ts-action">
        <h3>${func.name}</h3>
        <div>Inputs: ${func.inputs.map(input => `${input.name} (${input.type})`).join(', ') || 'None'}</div>
        <div>Outputs: ${func.outputs.map(output => `${output.name || 'unnamed'} (${output.type})`).join(', ') || 'None'}</div>
      </div>
    </ts:view>
  </ts:card>
    `.trim();
  };

  const generateOriginForInput = (input) => {
    return `
    <ts:attribute name="${input.name}">
      <ts:type>
        <ts:syntax>${input.type}</ts:syntax>
      </ts:type>
      <ts:origins>
        <ts:user-entry as="${input.type}"/>
      </ts:origins>
    </ts:attribute>
    `.trim();
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>TokenScript Generator V4</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <select 
          value={network.name} 
          onChange={(e) => setNetwork(networks.find(n => n.name === e.target.value))}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        >
          {networks.map((net) => (
            <option key={net.chainId} value={net.name}>{net.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Contract Address"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="Token Name (optional)"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="Token Symbol (optional)"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value)}
          style={{ width: '100%', padding: '0.5rem' }}
        />
      </div>
      
      <button 
        onClick={generateTokenScript}
        style={{ 
          backgroundColor: '#4CAF50', 
          border: 'none', 
          color: 'white', 
          padding: '15px 32px', 
          textAlign: 'center', 
          textDecoration: 'none', 
          display: 'inline-block', 
          fontSize: '16px',
          margin: '4px 2px',
          cursor: 'pointer'
        }}
      >
        Generate TokenScript
      </button>
      
      {error && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#ffcccb', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {tokenScript && (
        <div style={{ marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'semibold', marginBottom: '0.5rem' }}>Generated TokenScript:</h2>
          <pre style={{ backgroundColor: '#f0f0f0', padding: '1rem', borderRadius: '4px', overflowX: 'auto' }}>
            {tokenScript}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TokenScriptGenerator;