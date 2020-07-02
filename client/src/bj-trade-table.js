import { LitElement, html, css } from 'lit-element/lit-element.js';
import D from 'decimal.js';
import { format, parseISO, differenceInMilliseconds } from 'date-fns';
import prettyMS from 'pretty-ms';

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

      tr:nth-child(even) {
        background: #1b1f30;
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
          <th>Amount</th>
          <th>Commission</th>
          <th>Raw PnL</th>
          <th>PnL</th>
          <th>Funding</th>
          <th>Avg. Entry Price</th>
          <th>Avg. Exit Price</th>
          <th>Slippage open/close</th>
          <th>Exec. Delay (secs)</th>
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
        <td title=${item.amount}>${item.amount}</td>
        <td title=${item.fee}>${item.fee}</td>
        <td title=${item.rawPnl}>${item.rawPnl}</td>
        <td title=${item.pnl}>${item.pnl}</td>
        <td title=${D(item.funding || 0).mul(-1)}>${D(item.funding || 0).mul(-1)}</td>
        <td>${item.avgPrice}</td>
        <td>${item.avgPriceClose}</td>
        <td>${item.openSlippage} / ${item.closeSlippage}</td>
        <td>${this._executionDelay(item)}</td>
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

  _executionDelay(item) {
    return prettyMS(differenceInMilliseconds(parseISO(item.date), parseISO(item.candleCloseDate)))
  }
}

window.customElements.define('bj-trade-table', BjTradeTable);