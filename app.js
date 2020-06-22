
const express = require('express')
const bodyParser = require('body-parser')
const { Button, dialogflow, BrowseCarouselItem, BrowseCarousel, Image, Suggestions, Table, List, Carousel } = require('actions-on-google')
const App = dialogflow({ debug: true })
const axios = require('axios');
const { Suggestion } = require('dialogflow-fulfillment');


App.intent('Welcome', (conv) => {
  const contextApp = conv.contexts.get('sessionvars');
  // conv.contexts.set('sessionvars', 50, {...contextApp, "compantId":11155});
  // const contextvalue = conv.contexts;
});

App.intent('getDeliveryCategory', (conv, params, option) => {
  conv.ask("What a great day for Delivery!  We can provide more information on any of the categories shown below.");
  return axios.get(`https://api.instamarkt.co/api/v1/mol/companies/11155/getactivecategoriesnames`).then((success) => {
    let items = {};
    for (let i of success.data.data) {
      let item = {};
      item.synonyms = [i.name];
      item.title = `${i.name}`;
      item.image = new Image({
        url:  i.image === null || i.image === 'null' ? 'https://cdn.dribbble.com/users/1012566/screenshots/4187820/topic-2.jpg' : `${i.image}`,
        alt: `${i.name}`,
      });
      item.description = `${i.description}`;
      items[i.id] = item;
    }
    conv.ask(new List({ title: 'Browse Categories', items }));
  }).catch((error) => {
    conv.ask("Error in category");
  });
});

App.intent('getProductID', (conv, params, option) => {
  conv.ask("Select menu items you'd like to add to your order.");
  const contextApp = conv.contexts.get('sessionvars');
  return axios.get(`https://api.instamarkt.co/api/v1/mol/companies/11155/categories/${option}/menuitems`)
    .then(success => {
      if(contextApp.parameters.categoryId == null){
        var item = [];
        var temps = [];
        item.push(option);
        temps.push(success.data)
      }else{
        var item = contextApp.parameters.categoryId;
        var temps = contextApp.parameters.tempData;
        temps.push(success.data)
        item.push(option);
      }
      conv.contexts.set('sessionvars', 50, {"tempData":temps, "categoryId":item, "userId":11011});
      let items = {};
      if(success.data.length>0){
        for (let i of success.data) {
          let item = {};
          item.title = `${i[0].title}  ${i[0].meta.display_price.with_tax.formatted}`;
          item.synonyms = [i[0].name];
          item.image = new Image({
            url:  i[0].image === null || i[0].image === 'null' ? 'https://cdn.dribbble.com/users/1012566/screenshots/4187820/topic-2.jpg' : `${i[0].image}`,
            alt: `${i[0].title}`,
          });
          item.description = `${i[0].description}`;
          items[i[0].id] = item;
        }
        conv.ask(new Carousel({ title: 'Products', items }))
      }else{
        conv.ask("No menuitems in this Category");
      }
    }).catch(error => conv.ask("Error in Product"))
});

App.intent('getProductQuantity', (conv, params, option) => {
  const contextApp = conv.contexts.get('sessionvars');
  if(contextApp.parameters.ProductId == null){
    var item = [];
    var obj = {};
    obj.product = option;
    item.push(obj);
  }else{
    var item = contextApp.parameters.ProductId;
    var obj = {};
    obj.product = option;     
    item.push(obj);
  }
  conv.contexts.set('sessionvars', 50, {"ProductId":item});
  conv.ask("Quantity?");
  conv.ask(new Suggestions(["1","2","3","4","5"]))
});

App.intent('getProductAddon', (conv, params, option)=>{
  const contextApp = conv.contexts.get('sessionvars');
  const cont = conv.contexts.get('getProductAddon');
  console.log("--------",cont);
  conv.contexts.set('getProductAddon', 10);
  var field = contextApp.parameters.ProductId;
  var obj = contextApp.parameters.ProductId[contextApp.parameters.ProductId.length - 1];
  obj.number = option;
  field.pop();
  field.push(obj);
  conv.ask(`Any Add-Ons or Special instructions?`);
  return axios.get(`https://api.instamarkt.co/api/v1/mol/companies/11155/categories/${contextApp.parameters.categoryId[contextApp.parameters.categoryId.length-1]}/menuitems/${contextApp.parameters.ProductId[contextApp.parameters.ProductId.length-1].product}`)
  .then(success=>{
    let data = success.data[0];
    let items = {};
    conv.contexts.set('sessionvars', 50, {"ProductId":field, "addonPrice":data.addonprice, "addonMultiple":data.addonmultiple });
      for(let i=0; i<data.addonmultiple.length; i++){
        var item = {};
        // item.title = `${data.addonmultiple[i]}`;
        items[data.addonmultiple[i]] = item;
        // items[data.addonprice[i]] = item;
        item.image = new Image({
          url: `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-ReQm4Kk4zYT0OsISpLaQ5tTJpfg9ogpc49Y1A_hcE5Une59hMA&s`,
          alt: 'Image alternate text',
        });
        for(let j=0; j<=data.addonprice.length; j++){
          // item.description = `${data.addonprice[i]}`;
          item.title = `${data.addonmultiple[i]} (+$${data.addonprice[i]})`;
        }
      }
      for(let i of data.instruction){
        var item = {};
        item.title = `${i}`;
        item.image = new Image({
          url: `https://previews.123rf.com/images/pavlostv/pavlostv1806/pavlostv180600501/102793776-%C3%B0%C5%93an-read-a-book-simple-icon-education-symbol-instruction-manual-icon-%C3%A2%E2%82%AC%E2%80%9C-stock-vector.jpg`,
          alt: 'Image',
        });
        items[i] = item;
      }
    conv.ask(new List({ title: 'Any Add-Ons or Special instructions?', items }));
  }).catch(error=> conv.ask("Error in Product"))
});

App.intent('getCart',(conv, params, option)=>{
  const contextApp = conv.contexts.get('sessionvars');
  var value = contextApp.parameters.ProductId;
  var field = contextApp.parameters.addonMultiple.indexOf(option);
  var sec = contextApp.parameters.addonPrice[field];
  var obj = contextApp.parameters.ProductId[contextApp.parameters.ProductId.length - 1];
  if(obj && !option.startsWith("Remove")){
    obj.extra = sec;
    obj.title = option;
    value.pop();
    value.push(obj);
  }
  conv.ask("Here is the Cart Items");
  conv.contexts.set('sessionvars', 50, {"ProductId":value});
  var rows = [];
  var i =1;
  if(value.length){
    for(let j of value){
      let element = contextApp.parameters.tempData[contextApp.parameters.tempData.length - 1].filter(i=> i[0].id == j.product);
      console.log("3333333",element)
      let item = element[0][0];
      rows.push([`#${i++}` ,item.name,`$${item.price[0].amount}`, j.number,` ${j.title} +$${isNaN(Number(j.extra)) == true ? 0 : j.extra}` ,`$${parseInt(item.price[0].amount * j.number) + parseInt(isNaN(Number(j.extra)) == true ? 0 : j.extra * j.number)}`]);
    }
    var count = 1;
    for(let j of value){
      conv.ask(new Suggestions(`Remove Item ${count++}`))
    }
  }
  conv.ask(new Table({
    dividers: true,
    columns: ['Cart Item' ,'Product','Price', 'Quantity','Addon', 'Total'],
    rows
  }));
  conv.ask(new Suggestions("continue", "checkout"));
  return axios.get(`https://api.instamarkt.co/api/v1/mol/createCart/${contextApp.parameters.userId}`)
  .then(success=> {
    console.log(success.data)
  }).catch(error=> conv.ask("Error in cart"));
})

App.intent('deleteCartItem',(conv, params, option)=>{
  const contextApp = conv.contexts.get('sessionvars');
  let index = Number(option.match(/\d+/)[0]);
  let initial = contextApp.parameters.ProductId;
  let category = contextApp.parameters.categoryId;
  let temp = contextApp.parameters.tempData;
  initial.splice(index-1, 1);
  category.splice(index-1, 1);
  temp.splice(index-1, 1);
  conv.contexts.set('sessionvars', 50, {"ProductId":initial, "categoryId":category, "tempData":temp});
  conv.ask("Want to delete item");

  // console.log({option,contextApp})
  conv.followup('cartAction',{});
})

App.intent('Continue',(conv,params,option)=>{
  conv.ask("Continue for order");
  conv.followup('continueAction',{});
})

App.intent('Checkout',(conv,params,option)=>{
  const contextApp = conv.contexts.get('sessionvars');
  for(let i of contextApp.parameters.ProductId){
    let body = {
      "quantity": i.number,
      "itemId":i.product
    }
    console.log({body})
    axios.post(`https://api.instamarkt.co/api/v1/mol/addItemsToCart/${contextApp.parameters.userId}`,body)
    .then(success=>{
      console.log(success.data)
    })
    .catch(error=>{
      console.log({error})
    })
  }
  conv.ask("Successfully checkedout");
})


// App.intent('getProductInstructions', (conv, params, option)=>{
//   conv.ask(`Please select the Instructions for Order`);
//   return axios.get(`https://api.instamarkt.co/api/v1/mol/companies/11155/categories/de385cdb-fd84-4d2b-8e8e-ba87784a793f/menuitems/cf21704a-d4a0-406d-8942-1a84a00e3bc9`)
//   .then(success=>{
//     let data = success.data[0];
//     let items = {};
//       for(let i=0; i<data.instruction.length; i++){
//         var item = {};
//         item.title = `${data.instruction[i]}`;
//         items[data.instruction[i]] = item;
//       }
//     conv.ask(new List({ title: 'Instructions for Order', items }));
//   }).catch(error=> conv.ask("Error in Product"))
// });
     

App.intent('getDeliveryAddress',(conv, params, option)=>{
  conv.ask(`Please select the Delivery Address`);
  return axios.get(`https://api.instamarkt.co/api/v1/rel/customers/1/delivery_addresses`)
  .then(success=>{
    let items = {};
    for(let i of success.data){
      let item = {};
        item.title = `${i.title}`;
        item.description = `${i.address1} ${i.address2} ${i.city} ${i.state}    Phone No.- ${i.phone}`;
        items[i.title] = item;
    }
    conv.ask(new List({ title: 'Delivery Addresses', items }));
  }).catch(error=> conv.ask("Error in Product"))
})

App.intent('getTakeoutCategory', (conv, params, option) => {
  conv.ask("You'd like to place a Takeout order!  We can provide more information on any of the categories shown below.");
  return axios.get(`https://api.instamarkt.co/api/v1/mol/companies/11155/getactivecategoriesnames`).then((success) => {
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
