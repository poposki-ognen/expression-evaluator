
class Node {
    parent: any;
    constructor() {
        Object.defineProperty(this, "parent", {
            writable: true,
            //enumerable: false,    //so it doesn't show up in JSON
            value: null
        })
    }
    compute(ctx:any) {}
    toString() {}

}
class ValueNode extends Node {
    value:any;
    constructor(value:number) {
        super();
        this.value = value;
    }
    compute(ctx:any) {
        return this.value;
    }
    toString() {
        return JSON.stringify(this.value);
    }
}
class PropertyNode extends Node {
    property: any;
    constructor(property:any) {
        super();
        this.property = property;
    }
    compute(ctx:any) {
        return ctx[this.property];
    }
    toString(){ return String(this.property); }
}
class OperatorNode extends Node {
    op:any;
    left: Node;
    right: Node;
    constructor(op:any, l: Node, r:Node) {
        if( !(l instanceof Node) || !(r instanceof Node)) {

        }
        super();
        this.op = op;
        this.left = l;
        this.right = r;
        l.parent = this;
        r.parent = this;
    }
    compute(ctx: any) {
        var l:any = this.left.compute(ctx);
        var r:any = this.right.compute(ctx);
        switch(this.op){
            //logic operators
            case "&&": return l && r;
            case "||": return l || r;

            //comparison-operators
            case "=": return l === r;
            case "<=": return l <= r;
            case ">=": return l >= r;
            case "!=": return l != r;
            case ">": return l > r;
            case "<": return l < r;

            //computational operators
            case "+": return l + r;
            case "-": return l - r;
            case "*": return l * r;
            case "/": return l / r;
        }
    }
    toString(){
        return "( " + this.left.toString() + " " + this.op + " " + this.right.toString() + " )";
    }
}

class DotNode extends OperatorNode{
    constructor(l:any, r:any){
        if(!(r instanceof PropertyNode)){
        }
        super(".", l, r);
    }

    compute(ctx:any){
        return this.right.compute( this.left.compute(ctx) );
    }
    toString(){
        return this.left.toString() + "." + this.right.toString();
    }
}

class UnaryNode extends Node{
    op:any;
    node: Node;
    constructor(op:any, node:Node){
        if(!(node instanceof Node)){
            throw new Error("invalid node passed")
        }
        super();
        this.op = op;
        this.node = node;
        node.parent = this;
    }
    compute(ctx:any){
        var v:any = this.node.compute(ctx);
        switch(this.op){
            case "!": return !v;
        }
        throw new Error("operator not implemented '"+this.op+"'");
    }
    toString(){
        return  "( " + this.op + " " + this.node.toString() + " )";
    }
}

export class EvaluatorService {
    public readonly binaryOperators: string[] = ["*","/","+","-",
        ">","<","<=",">=","!=","=",
        "&&","||",];
    public readonly unaryOperators : string[] = ['!'];

    tokenParser = new RegExp([
        /\d+(?:\.\d*)?|\.\d+/.source,
        [".", "(", ")"].concat(this.unaryOperators, this.binaryOperators)
            .sort((a,b) => b.length-a.length) //so that ">=" is added before "=" and ">", for example
            .map(str => String(str).replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&'))
            .join("|"),
        /[a-zA-Z$_][a-zA-Z0-9$_]*/.source,
        /\S/.source
    ].map(s => "("+ s +")").join("|"), "g");

    parseExpression(str:string) {
        var tokens: any[] = [];
        //abusing str.replace() as a RegExp.forEach
        str.replace(this.tokenParser, function(token:any, number, op, property){
            if(number){
                token = new ValueNode(+number);
            }else if(property){
                token = new PropertyNode(property);
            }else if(!op){
                throw new Error("unexpected token '"+token+"'");
            }
            tokens.push(token);
            return '';
        });

        for(var i; (i=tokens.indexOf(".")) > -1; ){
            tokens.splice(i-1, 3, new DotNode(tokens[i-1], tokens[i+1]))
        }

        for(var i,j; (i=tokens.lastIndexOf("(")) > -1 && (j=tokens.indexOf(")", i)) > -1;){
            tokens.splice(i, j+1-i, this.passContext(tokens.slice(i+1, j)));
        }
        if(~tokens.indexOf("(") || ~tokens.indexOf(")")){
            throw new Error("mismatching brackets");
        }

        return this.passContext(tokens);
    }

    passContext(tokens:any) {
        this.unaryOperators.forEach(token => {
            for(var i:any=-i; (i=tokens.indexOf(token, i+1)) > -1;){
                tokens.splice(i, 2, new UnaryNode(token, tokens[i+1]));
            }
        })

        this.binaryOperators.forEach(token => {
            for(var i:any=1; (i=tokens.indexOf(token, i-1)) > -1;){
                tokens.splice(i-1, 3, new OperatorNode(token, tokens[i-1], tokens[i+1]));
            }
        });

        if(tokens.length !== 1){
        }
        return tokens[0];
    }
}

const expressionEvaluator = new EvaluatorService();
console.log(expressionEvaluator.parseExpression('id+2').passContext({id: 12345}));