const express =require ('express');
const app =express();
const mongoose = require('mongoose');
const{User}=require('./model/User');
const bcrypt =require('bcryptjs');
const jwt=require('jsonwebtoken');
const cors=require('cors');
const morgan=require('morgan');
const {Product}=require('./model/Product');
const {Cart} = require('./model/Cart');

// middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());



let MONGODB_URL='mongodb+srv://pattanshettirekha6:3D8gQgAUbg9rjzvs@cluster0.j3expmd.mongodb.net/?retryWrites=true&w=majority'
mongoose.connect(MONGODB_URL)
.then(()=>{
    console.log('db connected');
}).catch((err)=>{
    console.log('db is not connected',err);

})
// task 1  creat route for user registration
app.post ('/register',async(req,res)=>{
    try{
        let {name,email,password}=req.body;
        if (!name|| !email || !password){
            return res.status(400).json({
                message:"Please enter all fields"
            })
        }
        // check if user aleady exists
        let user =await User.findOne({email});
        if (user){
            return res.status(400).json({
                message:"User already has a account"
            })
        }else{
            // hash the password
            let salt=await bcrypt.genSalt(10);
            let hashedPassword= bcrypt.hashSync(password,salt);
            
            // generate token 
            const token=jwt.sign({email},"supersecret",{expiresIn:'365d'})
            // create user 
            await User.create({
                name,
                email,
                password: hashedPassword,
                token,
                role:'user'
            })   
            return res.status(200).json({
                message:"User is created successfully"
            }) 
        }
    } catch(error){
        console.log(error);
        res.status(400).json({message :"Internal server error"})
    }
})

// task 2 create route for user login
app.post('/login',async(req,res)=>{
    try{
        let {email,password}=req.body;
        if(!email ||!password){
            return res.status(400).json({
                message:"please enter all fields"
            })
        }
        // check user exists or not
        let user=await User.findOne({email});
        if(!user){
            return res.status(400).json({
                message:"user is not registered ,please register"
            })
        }
        // compare the enter password
        let isPasswordMatched=bcrypt.compareSync(password,user.password);
        if(!isPasswordMatched){
            return res.status(400).json({
                message:"invalid password"
        })
        }
        return res.status(200).json({
            message:"User is login successfully",
            id:user._id,
            name:user.name,
            token:user.token,
            email:user.email,
            role:user.role
        })
    } catch(error){
        console.log(error);
        res.status(400).json({message :"Internal server error"})
    }
})
 
// task 3 create route  for see all product
app.get('/products',async(req,res)=>{
    try{
        const products=await Product.find();
        return res.status(200).json({
            products:products
        })
    } catch(error){
        console.log(error);
        res.status(400).json({message :"Internal server error"})
    }
})

// task 4 create rout efor add products
app.post('/add-product',async(req,res)=>{
    try{
        let{name,price,stock,brand,image,description}=req.body;
        let {token}=req.headers;
        let decodedToken =jwt.verify(token,"supersecret");
        let user =await User.findOne({email:decodedToken.email});
        let product=await Product.create({
            name,
            price,
            stock,
            brand,
            image,
            description,
            user:user._id
        })
        return res.status(200).json({
            message:"product created successfully",
            product:product
        })
    }catch(error){
        console.log(error);
        res.status(400).json({message :"Internal server error"})
    }
})

// task 5  create route to see particular product
app.get('/product/:id',async(req,res)=>{
    try{
        let {id}=req.params;
        if(!id){
            return res.status(400).json({
                message:"Product id not found"
            })
        }
        let{token}=req.headers;
        let decodedToken=jwt.verify(token,"supersecret");
        if(decodedToken.email){
            const product=await Product.findById(id);
            
            if(!product){
                return res.status(400).json({
                    message:"Product not found"
                })
            }
            return  res.status(200).json({
                product:product
            })
        }
    }catch(error){
        console.log(error);
        res.status(400).json({message :"Internal server error"})
    }
})

//task-6 update a product
app.patch('/product/edit/:id',async(req,res)=>{
    const {id} = req.params;
    const {token} = req.headers;
    const {name, image, price, stock, brand, description} = req.body.productData;
    const decodedtoken = jwt.verify(token, "supersecret");
    try{
       if(decodedtoken.email){
           const updatedProduct = await Product.findByIdAndUpdate(id,{
              name,
              description,
              image,
              price,
              brand,
              stock 
           })
           return res.status(200).json({
               message:"product updated successfully",
               product: updatedProduct
           })
       }
    }catch(error){
           console.log(error);
           res.status(500).json({message:"Inernal server Error"})
       }
   })
   
   //task-7 delete the product
   app.delete('/product/delete/:id',async(req,res)=>{
       const {id}  = req.params;
       if(!id){
           return res.status(400).json({message:"Product id not found"});
       }
       try{
           const deletedProduct = await Product.findByIdAndDelete(id);
   
           if(!deletedProduct){
               return res.status(404).json({message:"Product not found"})
           }
   
           return res.status(500).json({
               message:"Product deleted succcessfuly",
               product: deletedProduct
           })
   
       }catch(error){
           console.log(error);
           res.status(500).json({message:"Inernal server Error"})
       }
   })


//    task 8 create route to see  all product in cart
app.get('/cart',async(req,res)=>{
    try{
        let {token} = req.headers;
        let decodedtoken = jwt.verify(token, "supersecret");
        const user = await User.findOne({email:decodedtoken.email}).populate({
            path:'cart',
            populate:{
                path:'products',
                model:'Product'
            }   
        })
        if(!user){
            return res.status(400).json({
                message:"User not found"
            })
        }
        return res.status(200).json({
             cart:user.cart
        })
    }catch(error){
           console.log(error);
           res.status(500).json({message:"Inernal server Error"})
       }
    
})

//task-9 -> create route to add product in cart
app.post('/cart/add',async(req,res)=>{
    const body = req.body;
    const productArray = body.products;
    let totalPrice = 0;
    try{
        for(const item of productArray){
            const product = await Product.findById(item);

            if(product){
                totalPrice += product.price;
            }
        }

        const {token} = req.headers;
        const decodedtoken = jwt.verify(token, "supersecret");
        const user = await User.findOne({email:decodedtoken.email});

        if(!user){
            res.status(404).json({message:"User not found"});
        }
        let cart;
        if(user.cart){
            cart = await Cart.findById(user.cart).populate("products");
            const existingProductIds = cart.products.map((product)=>{
                product._id.toString()
            })

            productArray.forEach(async(productId)=>{
                if(!existingProductIds.includes(productId)){
                    cart.products.push(productId);

                    const product = await Product.findById(productId);
                    totalPrice += product.price;
                }
            })
            cart.total = totalPrice;
            await cart.save();
        }else{
            cart = new Cart({
              products: productArray,
              total:totalPrice  
            });
            await cart.save();
            user.cart = cart._id;
            await user.save();
        }
        res.status(201).json({message:"cart updated succcesfully",
            cart:cart
        })

    }catch(error){
        console.log(error);
        res.status(500).json({message:"Inernal server Error"})
    }
})

//task-10 ->  create route to delete product in cart
app.delete("/cart/product/delete", async (req, res) => {
    const { productID } = req.body;
    const { token } = req.headers;
  
    try {
      const decodedToken = jwt.verify(token, "supersecret");
      const user = await User.findOne({ email: decodedToken.email }).populate("cart");
  
      if (!user) {
        return res.status(404).json({ message: "User Not Found" });
      }
  
      const cart = await Cart.findById(user.cart).populate("products");
  
      if (!cart) {
        return res.status(404).json({ message: "Cart Not Found" });
      }
  
      const productIndex = cart.products.findIndex(
        (product) => product._id.toString() === productID
      );
  
      if (productIndex === -1) {
        return res.status(404).json({ message: "Product Not Found in Cart" });
      }
  
      cart.products.splice(productIndex, 1);
      cart.total = cart.products.reduce(
        (total, product) => total + product.price,
        0
      );
  
      await cart.save();
  
      res.status(200).json({
        message: "Product Removed from Cart Successfully",
        cart: cart,
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error Removing Product from Cart", error });
    }
  });

let PORT =8080;
app.listen(PORT,()=>{
    console.log(`Server is connected to port ${PORT}`)
})