import React, { useState, useEffect } from 'react';
import Tippy from '@tippyjs/react';
import { Actions, configStorageName } from '../../common';
import { getStorageItem, setStorageItem } from '../../storage';
import erc20Contracts from '../../../public/erc20Contracts.json' assert { type: 'json' };
import { LightClientVerifierInitArgs } from '../../LightClientVerifier';
import 'tippy.js/dist/tippy.css';

const Popup = () => {
  const initialFormData = {
    network: 'mainnet',
    beaconApiUrl: 'https://lodestar-mainnet.chainsafe.io',
    elRpcUrl: 'https://lodestar-mainnetrpc.chainsafe.io',
    initialCheckpoint: '0xf314332806af6d624de4ad01263a0e6ea41905465aaa81983cae627be3937fa3',
    erc20Contracts: JSON.stringify(erc20Contracts),
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    (async () => {
      const savedConfig = await getStorageItem(configStorageName);
      if (savedConfig) {
        let stringConfig = Object.assign({}, savedConfig, {
          erc20Contracts: JSON.stringify(savedConfig.erc20Contracts),
        });
        setFormData(stringConfig);
      }
    })();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    (async () => {
      let config = Object.assign({}, formData, {
        erc20Contracts: JSON.parse(formData.erc20Contracts),
      }) as LightClientVerifierInitArgs;
      await setStorageItem(configStorageName, config);
      chrome.runtime.sendMessage({ action: Actions.configUpdate });
      console.log('Configuration saved:', config);
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: Actions.configUpdate }, () => {
            if (
              chrome.runtime.lastError &&
              chrome.runtime.lastError.message !== 'The message port closed before a response was received.'
            ) {
              console.error('Error sending message:', chrome.runtime.lastError);
            }
          });
        }
      });
    })();
  };

  const handleReset = () => {
    (async () => {
      setFormData(initialFormData);
      let config = Object.assign({}, initialFormData, {
        erc20Contracts: JSON.parse(initialFormData.erc20Contracts),
      }) as LightClientVerifierInitArgs;
      await setStorageItem(configStorageName, config);
      chrome.runtime.sendMessage({ action: Actions.configUpdate });
      console.log('Configuration reset to defaults');
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: Actions.configUpdate }, () => {
            if (
              chrome.runtime.lastError &&
              chrome.runtime.lastError.message !== 'The message port closed before a response was received.'
            ) {
              console.error('Error sending message:', chrome.runtime.lastError);
            }
          });
        }
      });
    })();
  };

  return (
    <div className='App'>
      <header className='App-header'>
        <h1>Configuration</h1>
        <form id='config-form' onSubmit={handleSubmit}>
          <div className='form-group'>
            <label htmlFor='network'>Network:</label>
            <input
              className='form-control'
              type='text'
              id='network'
              name='network'
              value={formData.network}
              onChange={handleInputChange}
            />
          </div>

          <div className='form-group'>
            <label htmlFor='beaconApiUrl'>Beacon API URL:</label>
            <Tippy
              interactive={true}
              content={
                <span>
                  Server implementing&nbsp;
                  <a
                    onClick={() => chrome.tabs.create({ url: 'https://ethereum.github.io/beacon-APIs/#/Beacon' })}
                    href='https://ethereum.github.io/beacon-APIs/#/Beacon'
                  >
                    light client api routes
                  </a>
                </span>
              }
            >
              <a className='text-muted'>&nbsp;(What is this?)</a>
            </Tippy>
            <input
              className='form-control'
              type='text'
              id='beaconApiUrl'
              name='beaconApiUrl'
              value={formData.beaconApiUrl}
              onChange={handleInputChange}
            />
          </div>

          <div className='form-group'>
            <label htmlFor='elRpcUrl'>Ethereum RPC URL:</label>
            <input
              className='form-control'
              type='text'
              id='elRpcUrl'
              name='elRpcUrl'
              value={formData.elRpcUrl}
              onChange={handleInputChange}
            />
          </div>

          <div className='form-group'>
            <label htmlFor='initialCheckpoint'>Initial Checkpoint:</label>
            <Tippy
              interactive={true}
              content={
                <span>
                  See the&nbsp;
                  <a
                    onClick={() => chrome.tabs.create({ url: 'https://eth-clients.github.io/checkpoint-sync-endpoints/' })}
                    href='https://eth-clients.github.io/checkpoint-sync-endpoints/'
                  >
                    list of checkpoint providers
                  </a>
                </span>
              }
            >
              <a className='text-muted'>&nbsp;(What is this?)</a>
            </Tippy>
            <input
              className='form-control'
              type='text'
              id='initialCheckpoint'
              name='initialCheckpoint'
              value={formData.initialCheckpoint}
              onChange={handleInputChange}
            />
          </div>

          <div className='form-group' hidden>
            <label htmlFor='erc20Contracts'>ERC20 Contracts:</label>
            <textarea
              className='form-control'
              id='erc20Contracts'
              name='erc20Contracts'
              value={formData.erc20Contracts}
              onChange={handleInputChange}
            />
          </div>
          <div></div>

          <div>
            <input className='btn btn-primary' type='submit' value='Save' />
            <button className='btn btn-secondary' type='button' onClick={handleReset}>
              Reset Configuration
            </button>
          </div>
        </form>
      </header>
    </div>
  );
};

export default Popup;
