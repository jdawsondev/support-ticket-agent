// Artillery JS processor for randomizing customer names and item names
const diyItems = [
  "Hammer", "Screwdriver", "Paint Brush", "Drill", "Saw", "Tape Measure", "Wrench", "Pliers", "Sandpaper", "Level",
  "Utility Knife", "Chisel", "Ladder", "Paint Roller", "Stud Finder", "Caulking Gun", "Putty Knife", "Wire Cutter", "Toolbox"
];
const customers = ["Alice", "Bob", "Janet"];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  generateOrder: function (context, events, done) {
    const customerName = randomChoice(customers);
    const itemName = randomChoice(diyItems);
    const totalAmount = Math.floor(Math.random() * 991) + 10; // 10-1000
    context.vars.orderPayload = {
      customerName,
      totalAmount,
      items: [
        {
          name: itemName,
          price: totalAmount
        }
      ]
    };
    context.vars.randomCustomerName = customerName;
    return done();
  }
};
