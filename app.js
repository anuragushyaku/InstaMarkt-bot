
const express = require('express')
const bodyParser = require('body-parser')
const { Button, dialogflow, BrowseCarouselItem, BrowseCarousel, Image, Suggestions, Table, List, Carousel } = require('actions-on-google')
const App = dialogflow({ debug: true })
const axios = require('axios');

App.intent('Welcome', (conv) => {
  // conv.contexts.set({ name: 'delivery', lifespan: 2, parameters: { city: 'Rome' }});
  // console.log('In Same', conv.contexts.get('delivery'));
  conv.contexts.set('delivery', 5, { companyId: '11131' });
  const contextvalue = conv.contexts;
  console.log("ffffffffffffff", contextvalue.output['delivery'].parameters);
  // conv.ask('Hello from developement')
});

App.intent('Delivery', (conv, data,abc,bcd) => {
  conv.ask("What a great day for Delivery!  We can provide more information on any of the categories shown below.");
  console.log('In Different Intent---------------', conv.contexts.get('delivery'));
  console.log({data,abc,bcd})
  return axios.get(`https://api.instamarkt.co/api/v1/mol/companies/11131/getactivecategoriesnames`).then((success) => {
    let items = {};
    for (let i of success.data.data) {
      let item = {};
      item.synonyms = [i.name];
      item.title = `${i.name}`;
      item.image = new Image({
        url: `${i.image}`,
        alt: 'Image alternate text',
      });
      item.description = `${i.description}`;
      items[i.id] = item;
    }
    conv.ask(new List({ title: 'Food Categories', items }));
  }).catch((error) => {
    conv.ask("Error in category");
  });
});

const app = express().use(bodyParser.json());
app.post('/dialogflow', App)
app.get('/', (req, res) => res.send('online'))

module.exports = app
