import React, { useState } from 'react';
import { ethers } from 'ethers';

const ETHERSCAN_API_KEY = 'QRVS1S4PQ2GXRQKDJMQHPTA5H6548FCW6Q'; // Replace with your Etherscan API key

const TokenScriptGenerator = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [tokenScript, setTokenScript] = useState('');
  const [error, setError] = useState('');

  const fetchABI = async (address) => {
    const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${ETHERSCAN_API_KEY}`;
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

      if (!contractAddress) {
        throw new Error('Please provide a contract address');
      }

      const abi = await fetchABI(contractAddress);
      const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/9e5f595ea96948429ef80c8924526540');
      const contract = new ethers.Contract(contractAddress, abi, provider);

      let name, symbol;
      try {
        name = await contract.name();
        symbol = await contract.symbol();
      } catch (e) {
        console.error("Error fetching name or symbol:", e);
        name = "Unknown Token";
        symbol = "UNKNOWN";
      }

      const functions = abi.filter(item => item.type === 'function');

      const attributes = generateAttributes(functions, contractAddress);
      const cards = generateCards(functions, contractAddress);

      const tokenScriptXml = `
<?xml version="1.0" encoding="UTF-8"?>
<ts:token xmlns:ts="http://tokenscript.org/2020/06/tokenscript"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://tokenscript.org/2020/06/tokenscript http://tokenscript.org/2020/06/tokenscript.xsd"
          custodian="false">
  <ts:name>
    <ts:string xml:lang="en">${name}</ts:string>
  </ts:name>
  <ts:contract interface="erc20" name="${name}">
    <ts:address network="1">${contractAddress}</ts:address>
  </ts:contract>
  
  <ts:origins>
    <ts:ethereum contract="${contractAddress}"/>
  </ts:origins>

  ${attributes}

  <ts:cards>
    ${cards}
  </ts:cards>
</ts:token>
      `;

      setTokenScript(tokenScriptXml);
    } catch (err) {
      setError('Error generating TokenScript: ' + err.message);
    }
  };

  const generateAttributes = (functions, contractAddress) => {
    return functions
      .filter(func => func.stateMutability === 'view' && func.inputs.length === 0)
      .map(func => `
  <ts:attribute name="${func.name}">
    <ts:type>
      <ts:syntax>${getSyntax(func.outputs[0].type)}</ts:syntax>
    </ts:type>
    <ts:label>
      <ts:string xml:lang="en">${capitalize(func.name)}</ts:string>
    </ts:label>
    <ts:origins>
      <ethereum:call as="${getEthereumType(func.outputs[0].type)}" function="${func.name}" contract="${contractAddress}">
      </ethereum:call>
    </ts:origins>
  </ts:attribute>
      `).join('\n');
  };

  const generateCards = (functions, contractAddress) => {
    return functions
      .filter(func => func.stateMutability !== 'view')
      .map(func => `
    <ts:card type="action" name="${func.name}">
      <ts:label>
        <ts:string xml:lang="en">${capitalize(func.name)}</ts:string>
      </ts:label>
      <ts:view xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
        <style type="text/css">.ts-card { font-family: "SourceSansPro"; }</style>
        <div class="ts-card">
          <h3>${capitalize(func.name)}</h3>
          <p>This is a sample view for the ${func.name} function.</p>
        </div>
      </ts:view>
      <ts:transaction>
        <ethereum:transaction function="${func.name}" contract="${contractAddress}">
          ${func.inputs.map(input => `
          <ts:data>
            <ts:${getEthereumType(input.type)} name="${input.name}"/>
          </ts:data>
          `).join('\n')}
        </ethereum:transaction>
      </ts:transaction>
    </ts:card>
      `).join('\n');
  };

  const getSyntax = (type) => {
    if (type.startsWith('uint') || type.startsWith('int')) {
      return '1.3.6.1.4.1.1466.115.121.1.36';
    } else if (type === 'string') {
      return '1.3.6.1.4.1.1466.115.121.1.26';
    } else if (type === 'bool') {
      return '1.3.6.1.4.1.1466.115.121.1.7';
    } else if (type === 'address') {
      return '1.3.6.1.4.1.1466.115.121.1.15';
    } else {
      return '1.3.6.1.4.1.1466.115.121.1.15'; // Default to Directory String
    }
  };

  const getEthereumType = (type) => {
    if (type.startsWith('uint') || type.startsWith('int')) {
      return 'uint';
    } else if (type === 'string') {
      return 'utf8';
    } else if (type === 'bool') {
      return 'bool';
    } else if (type === 'address') {
      return 'address';
    } else {
      return 'bytes';
    }
  };

  const capitalize = (s) => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>TokenScript Generator v5</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Contract Address"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
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
          <pre style={{ backgroundColor: '#f0f0f0', padding: '1rem', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {tokenScript}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TokenScriptGenerator;