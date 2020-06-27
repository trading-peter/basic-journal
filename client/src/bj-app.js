/**
@license
Copyright (c) 2020 trading_peter
*/

import './bj-chart.js';
import './bj-trade-table.js';
import './bj-balance-table.js';
import { LitElement, html } from 'lit-element';
import { fetchMixin } from './fetch-mixin.js';
import { parseISO, format } from 'date-fns';

class BjApp extends fetchMixin(LitElement) {
  render() {
    const accounts = this.accounts || [];
    const trades = this.trades || [];
    const balance = this.balance || [];

    return html`
      <style>
        :host {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          overflow: auto;
          overflow-x: hidden;
        }

        bj-chart {
          height: 600px;
        }

        .tools {
          padding: 20px;
        }
        
        .tabs {
          display: flex;
          margin-top: 30px;
          border-bottom: solid 1px #fff;
        }

        .tabs > div {
          line-height: 42px;
          font-size: 16px;
          padding: 0 20px;
          border-left: solid 1px #fff;
          border-top: solid 1px #fff;
          cursor: pointer;
        }

        .tabs > div:last-child {
          border-right: solid 1px #fff;
        }

        [hidden] {
          display: none;
        }
      </style>

      <div class="tools">
        <select id="account" @change=${this._selectAccount}>
          ${accounts.map(acc => html`
            <option value=${acc}>${acc}</option>
          `)}
        </select>
      </div>

      <div class="wrap">
        <bj-chart .account=${this._selAccount}></bj-chart>
      </div>

      <div class="tabs">
        <div @click=${() => this._selSection = 'trades'}>Trades</div>
        <div @click=${() => this._selSection = 'balance'}>Wallet History</div>
      </div>

      <bj-trade-table ?hidden=${this._selSection !== 'trades'} .entries=${trades}></bj-trade-table>
      <bj-balance-table ?hidden=${this._selSection !== 'balance'} .entries=${balance}></bj-balance-table>
    `;
  }

  static get properties() {
    return {
      accounts: { type: Object },
      trades: { type: Array },
      balance: { type: Array },
      _selAccount: { type: String },
      _selSection: { type: String },
    };
  }

  constructor() {
    super();

    this.trades = [];
    this.balance = [];
    this._selSection = 'trades';
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();

    await this._loadAppConfig();
  }

  async _loadAppConfig() {
    const resp = await this.get('/appConfig');
    this.accounts = resp.config.accounts;
    this._selAccount = this.accounts[0];
    this._loadStats();
  }

  async _loadStats() {
    const { trades, balance } = await this.post('/stats', { account: this._selAccount });
    this.trades = trades;
    this.balance = balance;
    
    this.querySelector('bj-chart').setRecords(balance.map(rec => {
      return {
        time: format(parseISO(rec.date), 'yyyy-MM-dd'),
        value: parseFloat(rec.balance)
      };
    }));
  }

  _selectAccount(e) {
    this._selAccount = e.target.value;
    this._loadStats();
  }
}

window.customElements.define('bj-app', BjApp);