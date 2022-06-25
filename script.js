'use strict';
// money we are supporting
const supported = ['AED', 'AFN', 'ALL', 'AOA', 'ARS', 'AWG', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CLF', 'CLP', 'CNH', 'CNY', 'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'DJF', 'DZD', 'EGP', 'ERN', 'ETB', 'FJD', 'GEL', 'GGP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'IMP', 'INR', 'IQD', 'ISK', 'JEP', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KWD', 'KYD', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MGA', 'MMK', 'MNT', 'MOP', 'MRO', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TWD', 'UAH', 'UGX', 'UYU', 'VES', 'VND', 'VUV', 'WST', 'XAG', 'XAU', 'XDR', 'XPD', 'XPT', 'YER', 'ZAR', 'ZMW', 'ZWL']
const selects = document.querySelectorAll('select');
const erMessage = document.querySelector('.error-message');
const inputSend = document.querySelector('#sending-amount');
const inputReceive = document.querySelector('#receiving-amount');
const transactionDetails = document.querySelector('.show-detail');

class Exchanger {
   date = new Date();
   constructor(pairs, symbol, rate, base) {
      this.pairs = pairs;
      this.symbol = symbol;
      this.rate = rate;
      this.base = base;
   }

   get customeRate() { // handle all kind of rate pairs
      if (this.pairs.sender === this.base) {
         return this.rate[this.pairs.receiver];
      } else {
         return this.rate[this.pairs.receiver] / this.rate[this.pairs.sender];
      }
   }

}

class Sender extends Exchanger {
   constructor(pairs, symbol, rate, base, sendingAmount) {
      super(pairs, symbol, rate, base)
      this.sendingAmount = sendingAmount;
      this._getReceivingAmount();
   }

   _getReceivingAmount() {
      this.receivingAmount = this.sendingAmount * this.customeRate;
   }
}

class Receiver extends Exchanger {
   constructor(pairs, symbol, rate, base, receivingAmount) {
      super(pairs, symbol, rate, base)
      this.receivingAmount = receivingAmount;
      this._getSendingAmount();
   }

   _getSendingAmount() {
      this.sendingAmount = this.receivingAmount / this.customeRate;
   }

}

class Processor {
   #base = 'USD';
   #taxRate = 6.35 / 100; // 6.35%
   #fee = 5 / 100;  // 5% or less 
   constructor() {
      this._getCurrInfo();
      this._getCurrentRate();
      //handling interactions
      inputSend.addEventListener('blur', this._senderFn.bind(this));
      selects[0].addEventListener('change', this._senderFn.bind(this));
      inputReceive.addEventListener('blur', this._receiverFn.bind(this));
      selects[1].addEventListener('change', this._receiverFn.bind(this));
      //problem (solved already but I learn alot here, )
      this._userSubmit();
      this._clearFields();

   }
   // <--Filling up <select> with supported currencies\\
   _getCurrInfo() {
      axios.get('https://restcountries.eu/rest/v2/all') //skip ->.then(response  => response.json())
         .then(response => {
            let datas = response.data;
            selects.forEach(select => {
               datas.forEach(data => {
                  this._renderOptions(data, select);
               })
            })
         })
         .catch(error => {
            erMessage.textContent = `We encountered ${error.message}`;
         })
   }

   _renderOptions(currInfo, optionBtn) {
      const [{ code, symbol }] = currInfo.currencies;
      if (supported.includes(code) && symbol) {
         const html = `<option value="${code}" data-symbol="${symbol}">${currInfo.name} ${symbol}</option>`;
         optionBtn.insertAdjacentHTML('beforeend', html)
      }
   }
   //<--fetching our Exchange rates -->
   _getCurrentRate() {   //Let's use async-await this time (not to void consistency but to show we can consume both)
      (async function () {
         try {
            const response = await axios(`https://api.exchangerate.host/latest?base=${this.#base}`)
            this.allRate = response.data.rates; //attaching all rate to the app obj
         } catch (error) {
            erMessage.textContent = `Sorry, We encountered ${error.message}`;
         }
      }).call(this) //I bind it to mama then to granny
   }
   ////////////////////////////working on interaction////////////////////////////////////
   _senderFn() { //on blur send input
      const sendingAmount = +inputSend.value;
      if (!Number.isFinite(sendingAmount)) {
         erMessage.textContent = `Invalid input`;
         return;
      }

      this._getFormData(); //paste
      const exchange = new Sender(this.pairs, this.symbols, this.allRate, this.#base, sendingAmount)
      if (!exchange.sendingAmount) return;
      this._renderTranDetail(exchange);
   }

   _receiverFn() { //on blur send input
      const receivingAmount = +inputReceive.value;
      if (!Number.isFinite(receivingAmount)) {
         erMessage.textContent = `Invalid input`;
         return;
      }
      this._getFormData()//paste
      const exchange = new Receiver(this.pairs, this.symbols, this.allRate, this.#base, receivingAmount)
      if (!exchange.receivingAmount) return;
      this._renderTranDetail(exchange);
   }

   _getFormData() { //copy
      this.pairs = { sender: selects[0].value, receiver: selects[1].value };
      const sendSign = selects[0].options[selects[0].selectedIndex];
      const receiveSign = selects[1].options[selects[1].selectedIndex];
      this.symbols = { sender: sendSign.dataset.symbol, receiver: receiveSign.dataset.symbol };
   }

   _renderTranDetail(trans) {
      document.querySelectorAll('.trans').forEach(element => element.classList.add('hidden')); //clean up before rendering
      const fm = this.formatNum;   // reduce this keyword usage  and shorten variable name
      const saleTax = trans.sendingAmount * this.#taxRate;
      const transactionFee = trans.sendingAmount * this.#fee;
      const total = fm(trans.sendingAmount + saleTax + transactionFee);
      //injecting into inputfield
      inputSend.value = fm(trans.sendingAmount);
      inputReceive.value = fm(trans.receivingAmount);
      const html = `
      <div class="trans">
          <h4 class="trans-title">Transaction Detail</h4>
           <ul class="trans-list">
             <li class="sending">Sending<span>${trans.symbol.sender}${fm(trans.sendingAmount)}</span></li>
             <li class="rate">Rate<span>${trans.symbol.receiver}${fm(trans.customeRate)}</span></li>
             <li class="fee">Transaction fee<span> ${trans.symbol.sender}${fm(transactionFee)}</span></li>
             <li class="tax">Tax<span> ${trans.symbol.sender}${fm(saleTax)}</span></li>
             <li class="recipient-gets">Recipient Gets<span> ${trans.symbol.receiver}${fm(trans.receivingAmount)}</span></li>
             <li class="total">Total<span>${trans.symbol.sender} ${total}</span></li>
           </ul>
        </div>
      </div>
     `;
      transactionDetails.insertAdjacentHTML('beforeend', html);
   }

   formatNum(number) {
      return new Intl.NumberFormat('en-US').format(number.toFixed(2));
   }
   //clean up after me
   _clearFields() {
      document.querySelectorAll('input[type=text]').forEach(field => field.addEventListener('focus', () => {
         field.value = '';
         erMessage.textContent = '';
      }))
   }
   // let handle user hitting Enter button
   _userSubmit() {
      document.querySelectorAll('.converter-form').forEach(form => form.addEventListener('submit', (event) => {
         event.preventDefault();
         if (event.type === 'submit' && inputSend.value) this._senderFn();
         if (event.type === 'submit' && inputReceive.value) this._receiverFn();
      }))
   }

}
const pro = new Processor();

