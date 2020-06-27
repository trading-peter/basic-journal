import { LitElement, html, css } from 'lit-element/lit-element.js';
import D from 'decimal.js';
import { format, parseISO } from 'date-fns';

class BjTradeTable extends LitElement {
  
  static get styles() {
    return css`
      :host {
        display: block;
        padding: 20px;
      }

      table {
        width: 100%;
        box-sizing: border-box;
        border-collapse: collapse;
      }

      th {
        font-weight: bold;
      }

      td, th {
        text-align: left;
        padding: 10px 5px;
      }

      td {
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100px;
      }
    `;
  }
  
  render() {
    const entries = this.entries || [];

    return html`
      <table border="1">
        <thead>
          <th>Execution Date</th>
          <th>Direction</th>
          <th>Balance</th>
          <th>Commission</th>
          <th>Raw PnL</th>
          <th>PnL</th>
          <th>Funding</th>
          <th>Avg. Entry Price</th>
          <th>Avg. Exit Price</th>
          <th>Slippage open/close</th>
        </thead>
        <tbody>
          ${entries.map((item, idx) => this._renderItem(item, idx))}
        </tbody>
      </table>
    `;
  }

  _renderItem(item, idx) {
    return html`
      <tr>
        <td>${this._formatDate(item.date)}</td>
        <td>${item.side}</td>
        <td>${item.amount}</td>
        <td>${item.avgPrice}</td>
        <td title=${item.fee}>${item.fee}</td>
        <td title=${item.rawPnl}>${item.rawPnl}</td>
        <td title=${item.pnl}>${item.pnl}</td>
        <td title=${D(item.funding || 0).mul(-1)}>${D(item.funding).mul(-1)}</td>
        <td>${item.avgPrice}</td>
        <td>${item.avgPriceClose}</td>
        <td>${item.openSlippage} / ${item.closeSlippage}</td>
      </tr>
    `;
  }

  static get properties() {
    return {
      entries: { type: Array },
    };
  }

  _formatDate(dateStr) {
    return format(parseISO(dateStr), 'yyyy-MM-dd HH:mm:ss');
  }
}

window.customElements.define('bj-trade-table', BjTradeTable);