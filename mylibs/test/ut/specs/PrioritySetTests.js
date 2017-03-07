// import PrioritySet from "../../../carbon-ui/js/mylibs/library/PrioritySet";

// describe("Priority set tests", function(){
//     it("Push until overflow", function () {
//         //arrange
//         var set = new PrioritySet(3);

//         //act
//         set.push({id: 1});
//         set.push({id: 2});
//         set.push({id: 3});
//         set.push({id: 4});

//         //assert
//         var result = set.toArray();
//         assert.equal(result.map(x => x.id).join(","), [4, 3, 2].join(","));
//     });

//     it("Replace last", function () {
//         //arrange
//         var set = new PrioritySet(3);

//         //act
//         set.push({id: 1});
//         set.push({id: 2});
//         set.push({id: 3});
//         set.push({id: 3});
//         set.push({id: 3});
//         set.push({id: 4});

//         //assert
//         var result = set.toArray();
//         assert.equal(result.map(x => x.id).join(","), [4, 3, 2].join(","));
//     });

//     it("Replace first", function () {
//         //arrange
//         var set = new PrioritySet(3);

//         //act
//         set.push({id: 1});
//         set.push({id: 2});
//         set.push({id: 3});
//         set.push({id: 1});
//         set.push({id: 1});
//         set.push({id: 4});

//         //assert
//         var result = set.toArray();
//         assert.equal(result.map(x => x.id).join(","), [4, 1, 3].join(","));
//     });

// });


