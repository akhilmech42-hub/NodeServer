const express=require('express')
const port=3001

const app=express()
app.use(express.json())


app.get('/user',(req,res)=>{
     const users=[
        {
        id:1,
        status: true,
        name: 'Akhil',
        mobile: '9876543210',
        age: '24'
    },
        {
        id:2,    
        status: true,
        name: 'sai',
        mobile: '9876543210',
        age: '21'
    },
    {
        id:3,
        status: false,
        name: 'ammulu',
        mobile: '8768459231',
        age: '15'
    },
    {
        id: 4,
        status: false,
        name: 'aavanthika',
        mobile: '9876534232',
        age: '13'
    },
    {
        id: 5,
        status: true,
        name: 'bala ankammarao',
        mobile: '47653247892',
        age: '8'
    }
    ];
res.json(users)
})


app.listen(port,()=>{
    console.log(`server running on http:localhost:${port}`)
})