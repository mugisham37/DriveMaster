import * as acorn from 'acorn'
import * as walk from 'acorn-walk'
import { generate } from 'astring'

interface ASTNode extends acorn.Node {
  body?: ASTNode | ASTNode[]
  [key: string]: unknown
}

export function injectLoopGuards(code: string): string {
  const ast = acorn.parse(code, {
    ecmaVersion: 2020,
    sourceType: 'module',
  }) as ASTNode

  let loopId = 0
  const usedGuards: string[] = []

  walk.ancestor(ast, {
    WhileStatement(node: ASTNode, ancestors: ASTNode[]) {
      const id = `__loop_guard_${loopId++}`
      usedGuards.push(id)
      guardLoop(node, ancestors, id)
    },
    ForStatement(node: ASTNode, ancestors: ASTNode[]) {
      const id = `__loop_guard_${loopId++}`
      usedGuards.push(id)
      guardLoop(node, ancestors, id)
    },
    DoWhileStatement(node: ASTNode, ancestors: ASTNode[]) {
      const id = `__loop_guard_${loopId++}`
      usedGuards.push(id)
      guardLoop(node, ancestors, id)
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

function guardLoop(node: ASTNode, ancestors: ASTNode[], loopVar: string) {
  /**
    AST of
    let ${loopVar} = 0;
   */
  const guard = {
    type: 'VariableDeclaration',
    kind: 'let',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: loopVar },
        init: { type: 'Literal', value: 0 },
      },
    ],
  }

  /*
  AST of
  if (++${loopVar} > __MAX_ITERATIONS) throw new Error("Infinite loop detected") 
   */
  const check = {
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
    node.body = {
      type: 'BlockStatement',
      body: [check, node.body],
    }
  } else {
    node.body.body.unshift(check)
  }

  // this is needed to make sure loop-guard variable is declared in the parent scope and before the loop
  // to avoid any reference errors
  const parentBody = findNearestBody(ancestors)
  if (parentBody && Array.isArray(parentBody)) {
    const index = parentBody.indexOf(node)
    if (index !== -1) {
      parentBody.splice(index, 0, guard as ASTNode)
    }
  }
}

function findNearestBody(ancestors: ASTNode[]): ASTNode[] | null {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const parent = ancestors[i]
    if (parent.type === 'BlockStatement' && Array.isArray(parent.body)) {
      return parent.body as ASTNode[]
    }
  }
  return null
}
