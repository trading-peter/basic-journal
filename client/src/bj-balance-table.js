import { LitElement, html, css } from 'lit-element/lit-element.js';
import D from 'decimal.js';
import { format, parseISO, differenceInMilliseconds } from 'date-fns';
import prettyMS from 'pretty-ms';

class BjBalanceTable extends LitElement {
  
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
          <th width="250">Date</th>
          <th>Balance</th>
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
        <td>${item.balance}</td>
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

window.customElements.define('bj-balance-table', BjBalanceTable);