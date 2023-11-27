import React, { useState, useEffect } from 'react';
import { Actions, configStorageName, initialConfig, NetworkEnum } from '../../common';
import { getStorageItem, setStorageItem } from '../../storage';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

const Popup = () => {
  const [selectedNetwork, setSelectedNetwork] = useState(NetworkEnum.MAINNET);
  const initialFormData = initialConfig[selectedNetwork];

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    (async () => {
      const savedConfig = await getStorageItem(configStorageName);
      setFormData(savedConfig[selectedNetwork]);
    })();
  }, [selectedNetwork]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const network = e.target.value as NetworkEnum;
    setSelectedNetwork(network);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    (async () => {
      let config = await getStorageItem(configStorageName);
      config[selectedNetwork] = formData;
      await setStorageItem(configStorageName, config);
      chrome.runtime.sendMessage({ action: Actions.configUpdate, config });
      console.log('Configuration saved:', config);
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: Actions.configUpdate, config }, () => {
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
      let config = await getStorageItem(configStorageName);
      config[selectedNetwork] = formData;
      await setStorageItem(configStorageName, config);
      chrome.runtime.sendMessage({ action: Actions.configUpdate, config });
      console.log(`Configuration for network ${selectedNetwork} reset to default`);
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: Actions.configUpdate, config }, () => {
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
        <form id='config-form' onSubmit={handleSubmit}>
          <div className='form-group'>
            <label htmlFor='network'>Select Network:</label>
            <select className='form-control' id='network' name='network' value={selectedNetwork} onChange={handleNetworkChange}>
              {Object.values(NetworkEnum).map((network) => (
                <option key={network} value={network}>
                  {network}
                </option>
              ))}
            </select>
          </div>
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
          <div className='form-group'>
            <input className='btn btn-primary form-control mb-2' type='submit' value='Save' />
            <button className='btn btn-secondary form-control' type='button' onClick={handleReset}>
              Reset Configuration
            </button>
          </div>
        </form>
      </header>
    </div>
  );
};

export default Popup;
