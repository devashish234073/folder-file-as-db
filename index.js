const express = require('express');
const app = express();
const fs = require("fs");
const PORT = process.env.PORT || 8787;

var bodyParser = require('body-parser')
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
})); 

var CATEGORY_DIR = 'data/categories';
var SALES_DIR = 'data/sales';

app.use(express.static('public'));

app.get('/test', (req, res) => {
  serveFile("htmls/test.html",res);
});

app.post('/createCategory', (req, res) => {
  var cat = req.body.productCategory;
  
  if(createCategory(cat)){
      serveFile("htmls/home.html",res,"Category "+req.body.productCategory+" created successfully",cat);
  } else {
	  serveFile("htmls/home.html",res,"Category "+req.body.productCategory+"already exists",cat);
  }
});

app.post('/changeSelectedCategory', (req, res) => {
  serveFile("htmls/home.html",res,"",req.body.productCategory);
});

app.post('/changeSelectedProduct', (req, res) => {
	var trans=JSON.stringify(getTransactions(req.body.productCategory,req.body.productName));
	//trans=trans.replace(/\"/'/g);
  serveFile("htmls/home.html",res,"PROD_CHANGE_OBJ:"+trans,req.body.productCategory,req.body.productName);
});

app.post('/createProduct', (req, res) => {
  var cat = req.body.productCategory;
  var prod = req.body.productName;
  if(createProduct(cat,prod,parseFloat(req.body.quantitiesAvailable))){
      serveFile("htmls/home.html",res,"Product "+req.body.productName+" created successfully",cat,prod);
  } else {
	  serveFile("htmls/home.html",res,"Product "+req.body.productName+" already exists",cat,prod);
  }
});

app.post('/sellQty', (req, res) => {
  var cat = req.body.productCategory;
  var prod = req.body.productName;
  if(productExists(cat,prod)){
	  var current_qty=getQuantity(cat,prod);
	  var toAdd=parseFloat(req.body.quantitiesSold);
	  if(toAdd<0){
		  serveFile("htmls/home.html",res,"can't sell negative quantity for "+prod,cat,prod);
	  } else {
          updateQtyInner(cat,prod,current_qty,-1*toAdd,res,"sold");	  
	  }
  } else {
	  serveFile("htmls/home.html",res,"Product "+prod+" does not exists",cat);
  }
});

app.post('/updateQty', (req, res) => {
  var cat = req.body.productCategory;
  var prod = req.body.productName;
  if(productExists(cat,prod)){
	  var current_qty=getQuantity(cat,prod);
	  var toAdd=parseFloat(req.body.toAdd);
	  if(toAdd<0){
		  serveFile("htmls/home.html",res,"can't add negative quantity for "+prod,cat,prod);
	  } else {
          updateQtyInner(cat,prod,current_qty,toAdd,res,"added");	  
	  }
  } else {
	  serveFile("htmls/home.html",res,"Product "+prod+" does not exists",cat);
  }
});

function updateQtyInner(cat,prod,current_qty,toAdd,res,TYPE){
	var newQty = toAdd;
	var path = CATEGORY_DIR+"/"+cat+"/"+prod;
	if(current_qty!=-1){
		newQty+=current_qty;
		fs.renameSync(path+"/Qty_"+current_qty,path+"/Qty_"+newQty);
	} else {
		fs.writeFileSync(path+"/Qty_"+newQty,"Qty:"+newQty);
	}
	fs.writeFileSync(path+"/Qty_"+newQty,"Qty:"+newQty);
	fs.writeFileSync(path+"/on_"+getDate()+"_"+TYPE+"_"+Math.abs(toAdd),"");
    serveFile("htmls/home.html",res,Math.abs(toAdd)+" "+TYPE+" successfully,new Qty:"+newQty,cat,prod);	
}

function getDate(){
    var d = new Date();
    return d.getDate()+"_"+(d.getMonth()+1)+"_"+(d.getYear()+1900)+"_"+d.getHours()+"_"+d.getMinutes()+"_"+d.getSeconds();
}

app.get('/', (req, res) => {
  serveFile("htmls/home.html",res);
});


function serveFile(filePath,res,xtraMessage,SELECTED_CATEG,SELECTED_PROD){
  fs.readFile(filePath,(err,data)=>{
    if(err){} else{
	  if(xtraMessage==undefined || xtraMessage==""){
		  data=String(data).replace("__INIT_ALERT__","");
	  } else {
		  data=String(data).replace("__INIT_ALERT__",xtraMessage);
	  }
	  var categs = getAllCategories();
	  var sel_categ="";
	  var sel_prod="";
	  if(SELECTED_CATEG==undefined || SELECTED_CATEG==""){
		  if(categs.length>0){
	          sel_categ=categs[0];
		  }
	  } else {
		  sel_categ=SELECTED_CATEG;
	  }
	  var prods = getAllProducts(sel_categ);
	  if(SELECTED_PROD==undefined || SELECTED_PROD==""){
		  if(prods.length>0){
	          sel_prod=prods[0];
		  }
	  } else {
		  sel_prod=SELECTED_PROD;
	  }
	  var qty=-999;
	  if(sel_categ!="" && sel_prod!=""){
		  qty=getQuantity(sel_categ,sel_prod);
	  }
	  data=String(data).replace("__CATEGORIES__",JSON.stringify(categs));
	  data=String(data).replace("__P_NAMES__",JSON.stringify(prods));
	  data=data.replace("__SELECTED_CATEG__",sel_categ);
	  data=data.replace("__SELECTED_PRODUCT__",sel_prod);
	  data=data.replace("__AVAIL_QTY__",qty+"");
      res.end(data);
    }
  });
}

function createNewSalesByDate(productName,qty){
	var d = getDate();
	
}

function productExists(categoryName,productName){
	if(fs.existsSync(CATEGORY_DIR+"/"+categoryName+"/"+productName)){
		return true;
	} else {
		return false;
	}
}

function createDir(dirRelPath){
	if(fs.existsSync(dirRelPath)){
		return false;
	} else {
		fs.mkdirSync(dirRelPath);
		return true;
	}
}

function createCategory(categoryName){
	return createDir(CATEGORY_DIR+"/"+categoryName);
}

function getAllCategories(){
	var cats = fs.readdirSync(CATEGORY_DIR);
	return cats;
}

function createProduct(categoryName,productName,qty){
	ret = createDir(CATEGORY_DIR+"/"+categoryName+"/"+productName);
	if(ret==false){
		return ret;
	}
	fs.writeFileSync(CATEGORY_DIR+"/"+categoryName+"/"+productName+"/Qty_"+qty,"Qty:"+qty);
	return ret;
}

function getTransactions(categoryName,productName){
	var files = fs.readdirSync(CATEGORY_DIR+"/"+categoryName+"/"+productName);
	var arr=[];
	for(var i=0;i<files.length;i++){
		var file = String(files[i]);
		if(!file.startsWith("Qty_")){
			var fileSplit=file.split("_");
			var date=fileSplit[1]+"/"+fileSplit[2]+"/"+fileSplit[3];
			var time=fileSplit[4]+":"+fileSplit[5]+":"+fileSplit[6];
			var qty=fileSplit[8];
			var type=fileSplit[7];
			var obj={type:type,date:date,time:time,qty:qty};
			arr.push(obj);
		}
	}
	return arr;
}

function getQuantity(categoryName,productName){
	var files = fs.readdirSync(CATEGORY_DIR+"/"+categoryName+"/"+productName);
	for(var i=0;i<files.length;i++){
		var file = String(files[i]);
		if(file.startsWith("Qty_")){
			file=file.replace("Qty_","");
			return parseInt(file);
		}
	}
	return -1;
}

function getAllProducts(categoryName){
	if(categoryName==undefined || categoryName==""){
		return [];
	}
	var cats = fs.readdirSync(CATEGORY_DIR+"/"+categoryName);
	return cats;
}

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
});