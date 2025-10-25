import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import { generate } from 'astring'

// Extended types for AST nodes with body property
interface LoopNode extends acorn.Node {
  body: acorn.Node
}

interface BlockStatementNode extends acorn.Node {
  type: 'BlockStatement'
  body: acorn.Node[]
}

interface ASTNode extends acorn.Node {
  start: number
  end: number
}

interface VariableDeclarationNode extends ASTNode {
  type: 'VariableDeclaration'
  kind: string
  declarations: Array<{
    type: string
    id: { type: string; name: string }
    init: { type: string; value: number }
  }>
}

interface IfStatementNode extends ASTNode {
  type: 'IfStatement'
  test: {
    type: string
    operator: string
    left: {
      type: string
      operator: string
      prefix: boolean
      argument: { type: string; name: string }
    }
    right: { type: string; name: string }
  }
  consequent: {
    type: string
    argument: {
      type: string
      callee: { type: string; name: string }
      arguments: Array<{ type: string; value: string }>
    }
  }
}

export function injectLoopGuards(code: string): string {
  const ast = acorn.parse(code, {
    ecmaVersion: 2020,
    sourceType: 'module',
  }) as ASTNode

  let loopId = 0
  const usedGuards: string[] = []

  walk.ancestor(ast, {
    WhileStatement(node: acorn.Node, ancestors: acorn.Node[]) {
      const id = `__loop_guard_${loopId++}`
      usedGuards.push(id)
      guardLoop(node as LoopNode, ancestors, id)
    },
    ForStatement(node: acorn.Node, ancestors: acorn.Node[]) {
      const id = `__loop_guard_${loopId++}`
      usedGuards.push(id)
      guardLoop(node as LoopNode, ancestors, id)
    },
    DoWhileStatement(node: acorn.Node, ancestors: acorn.Node[]) {
      const id = `__loop_guard_${loopId++}`
      usedGuards.push(id)
      guardLoop(node as LoopNode, ancestors, id)
    },
  })

  const guardVars = usedGuards.map((id) => `let ${id} = 0;`).join('\n')

  const finalCode = `
    const __MAX_ITERATIONS = 10000;
    ${guardVars}
    ${generate(ast)}
  `

  return finalCode
}

function guardLoop(node: LoopNode, ancestors: acorn.Node[], loopVar: string) {
  /**
    AST of
    let ${loopVar} = 0;
   */
  const guard: VariableDeclarationNode = {
    type: 'VariableDeclaration',
    kind: 'let',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: loopVar },
        init: { type: 'Literal', value: 0 },
      },
    ],
    start: 0,
    end: 0,
  }

  /*
  AST of
  if (++${loopVar} > __MAX_ITERATIONS) throw new Error("Infinite loop detected") 
   */
  const check: IfStatementNode = {
    type: 'IfStatement',
    test: {
      type: 'BinaryExpression',
      operator: '>',
      left: {
        type: 'UpdateExpression',
        operator: '++',
        prefix: true,
        argument: { type: 'Identifier', name: loopVar },
      },
      right: { type: 'Identifier', name: '__MAX_ITERATIONS' },
    },
    consequent: {
      type: 'ThrowStatement',
      argument: {
        type: 'NewExpression',
        callee: { type: 'Identifier', name: 'Error' },
        arguments: [{ type: 'Literal', value: 'Infinite loop detected' }],
      },
    },
    start: 0,
    end: 0,
  }

  // we check if the loop actually has a block body
  // and if it doesn't, we wrap it in a block statement
  // otherwise after the injection the code would be invalid JS.

  // code below turns this:

  // while (true) doSomething();
  // into this:
  // while (true) {
  //   if (++__loop_guard_0 > __MAX_ITERATIONS) throw new Error(...);
  //   doSomething();
  // }
  if (node.body.type !== 'BlockStatement') {
    const newBlockBody: BlockStatementNode = {
      type: 'BlockStatement',
      start: 0,
      end: 0,
      body: [check as acorn.Node, node.body],
    }
    node.body = newBlockBody as acorn.Node
  } else {
    (node.body as BlockStatementNode).body.unshift(check as acorn.Node)
  }

  // this is needed to make sure loop-guard variable is declared in the parent scope and before the loop
  // to avoid any reference errors
  const parentBody = findNearestBody(ancestors)
  if (parentBody && Array.isArray(parentBody)) {
    const index = parentBody.indexOf(node)
    if (index !== -1) {
      parentBody.splice(index, 0, guard as acorn.Node)
    }
  }
}

function findNearestBody(ancestors: acorn.Node[]): acorn.Node[] | null {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const parent = ancestors[i]
    if (parent && parent.type === 'BlockStatement') {
      const blockParent = parent as BlockStatementNode
      if (Array.isArray(blockParent.body)) {
        return blockParent.body
      }
    }
  }
  return null
}
