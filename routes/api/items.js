const express = require("express");
const router = express.Router();
const Items = require("../../models/Items.js");
const User = require("../../models/User.js");
const auth = require("../../middleware/auth.js");
const checkObjectID = require("../../middleware/checkObjectID.js");
const {check, validationResult} = require("express-validator");
const axios = require("axios");
const Dislike = require("../../models/Dislike.js");
const Like = require("../../models/Like.js");

// @route GET api/items
// @desc gives a list of items  
// @access Public
router.get("/", 
    async (req, res) => {
        //should get all items
        const items = await Items.find({});
        try {
            return res.json(items);
        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ error : "Server Error"});
        }
    }
)

// @route POST api/items
// @desc creates an item 
// @access Public
router.post("/", 
    async (req, res) => {
        const {rating, description, price} = req.body;
        
        try {
            let items = new Items({
                rating: rating,
                description: description,
                price: price
            });
            await items.save();
            return res.json(items);

        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ error : "Server Error"});
        }
    }
)

// @route POST api/items/comments/:id
// @desc adds a comment with a star rating and text
// @access Private
router.post("/comments/:id", auth, checkObjectID("id"), 
    check("text", "Please input a comment").notEmpty(),
    check("rating", "Please input a rating from 1 to 5").notEmpty(),
    async (req, res) => {
        const check = validationResult(req);
        if (!check) {
            return res.status(400).json({ errors: check.array()});
        }

        try {
            //finds item through id in header then populates
            const user = await User.findById(req.user.id).select("-password");
            const item = await Items.findById(req.params.id);

            const newComment = {
                user: req.user.id,
                name: user.name,
                text: req.body.text,
                rating: req.body.rating,
                avatar: user.avatar
            };

            item.comments.unshift(newComment);

            await item.save();

            res.json(item.comments);
        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ error : "Server Error"});
        }
    }
)

// @route DELETE api/items/comments/:item_id/:comment_id
// @desc deletes a comment with item_id/comment_id
// @access Private
router.delete("/comments/:item_id/:comment_id", auth,
    async (req, res) => {
        const item = await Items.findById(req.params.item_id);
        try {

            const comment = item.comments.find(
                (comment) => comment.id === req.params.comment_id
            );

            //if there is a comment with that id
            if(!comment){
                return res.status(400).json({ errors: "Comment not found"});
            }

            //checks if user is the comments poster
            if(req.user.id !== comment.user.toString()){
                return res.status(400).json({ errors: "Not authorized"});
            }

            item.comments = item.comments.filter(
                ({ id }) => id !== req.params.comment_id
            );

            await item.save();

            res.json(item.comments);

        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ error : "Server Error"});
        }
    }
)

// @route PUT api/items/comments/dislike/:item_id/:comment_id
// @desc dislikes a comment 
// @access Private
router.put("/comments/dislike/:item_id/:comment_id", auth,
    async (req, res) => {
        //checks it it already liked the comment
        const like = await Like.findOne({ comment : req.params.comment_id});
        //if they already liked it delete it if not it'll go on
        if(like){
            await Like.findOneAndDelete({comment: req.params.comment_id});
        }

        //checks it it already disliked the comment
        //finds if the user is logged in dislike array
        const dislike = await Dislike.findOne({ comment : req.params.comment_id})
        console.log(dislike);

        //if something is returned 
        if(dislike){
            res.json({ msg: "Already Disliked"});
        }

        //if null/no dislike
        const dislikeNew = new Dislike({
            comment : req.params.comment_id,
            user: req.user.id
        })

        await dislikeNew.save();

        res.send(dislikeNew);
    }
)

// @route PUT api/items/comments/un dislike/:item_id/:comment_id
// @desc un dislikes a comment 
// @access Private
router.put("/comments/undislike/:item_id/:comment_id", auth, 
    async (req, res) => {
        try {
            //finds a user in dislikes and deletes it
            await Dislike.findOneAndDelete({ comment : req.params.comment_id});
    
            res.json({ msg : "Dislike Deleted"});
        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ error : "Server Error"});
        }
    }
)

// @route PUT api/items/comments/like/:item_id/:comment_id
// @desc likes a comment 
// @access Private
router.put("/comments/like/:item_id/:comment_id", auth,
    async (req, res) => {
        //checks it it already disliked the comment
        const dislike = await Dislike.findOne({ comment : req.params.comment_id});
        //if they already disliked it delete it if not it'll go on
        if(dislike){
            await Like.findOneAndDelete({comment: req.params.comment_id});
        }

        //checks it it already disliked the comment
        //finds if the user is logged in dislike array
        const like = await Like.findOne({ comment : req.params.comment_id})
        console.log(like);

        //if something is returned 
        if(like){
            res.json({ msg: "Already Liked"});
        }

        //if null/no dislike
        const likeNew = new Like({
            comment : req.params.comment_id,
            user: req.user.id
        })

        await likeNew.save();

        res.send(likeNew);
    }
)

// @route PUT api/items/comments/un like/:item_id/:comment_id
// @desc un likes a comment 
// @access Private
router.put("/comments/unlike/:item_id/:comment_id", auth, 
    async (req, res) => {
        try {
            //finds a user in dislikes and deletes it
            await Like.findOneAndDelete({ comment : req.params.comment_id});
    
            res.json({ msg : "Like Deleted"});
        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ error : "Server Error"});
        }
    }
)

// @route Get api/items/comments/dislike/:item_id/:comment_id
// @desc gets a comments dislikes
// @access Public
router.get("/comments/dislike/:item_id/:comment_id", 
    async (req,res) => {
        try {
            const dislike = await Dislike.find({})
            res.json(dislike);
        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ error : "Server Error"});
        }
    }
)

// @route Get api/items/comments/like/:item_id/:comment_id
// @desc gets a comments ;ikes
// @access Public
router.get("/comments/like/:item_id/:comment_id", 
    async (req,res) => {
        try {
            const like = await Like.find({})
            res.json(like);
        } catch (error) {
            console.error(error.message);
            return res.status(500).json({ error : "Server Error"});
        }
    }
)




module.exports = router;