function isEmptyFunction(propValue) {
  if (propValue.type === 'ArrowFunctionExpression') {
    return !propValue.params.length && !propValue.body.body.length
  }
  return false
}

function genKeyValueMap(properties) {
  return properties.reduce((item, next) => {
    item[next.key.name] = next
    return item
  }, {})
}


function merge(oldProp, newProp) {
  const oldType = oldProp.value.type
  const newType = newProp.value.type
  if (oldType === newType) {
    switch(newType) {
      case 'ObjectExpression': {
        const oldMap = genKeyValueMap(oldProp.value.properties)
        const newMap = genKeyValueMap(newProp.value.properties)
        for (let i = 0; i < newProp.value.properties.length; i++) {
          const chNewProp = newProp.value.properties[i]
          const { key: {name} } = chNewProp
          if (oldMap[name]) {
            merge(oldMap[name], newMap[name])
          } else {
            oldProp.value.properties.push(newMap[name])
          }
        }
        break
      }
      case 'ArrowFunctionExpression': {
        if (isEmptyFunction(oldProp.value)) {
          oldProp.value = newProp.value
        } else {
          Array.prototype.push.apply(oldProp.value.body.body, newProp.value.body.body)
        }
        break
      }
      case 'ArrayExpression':
        oldProp.value.elements = oldProp.value.elements.concat(newProp.value.elements)
        break
      case 'Literal':
      default:
        oldProp.value = newProp.value
    }
  } else {
    oldProp.value = newProp.value
  }
}

module.exports = function extendJSConfig(value, source, replace = true) {
  const recast = require('recast')
  const stringifyJS = require('./stringifyJS')

  let exportsIdentifier = null

  const ast = recast.parse(source)

  recast.types.visit(ast, {
    visitAssignmentExpression(path) {
      const { node } = path
      if (
        node.left.type === 'MemberExpression' &&
        node.left.object.name === 'module' &&
        node.left.property.name === 'exports'
      ) {
        if (node.right.type === 'ObjectExpression') {
          extendConfig(node.right)
        } else if (node.right.type === 'Identifier') {
          // do a second pass
          exportsIdentifier = node.right.name
        }
        return false
      }
      this.traverse(path)
    },
  })

  if (exportsIdentifier) {
    recast.types.visit(ast, {
      visitVariableDeclarator({ node }) {
        if (node.id.name === exportsIdentifier && node.init.type === 'ObjectExpression') {
          augmentExports(node.init)
        }
        return false
      },
    })
  }

  function extendConfig(node) {
    const valueAST = recast.parse(`(${stringifyJS(value, null, 2)})`)
    const props = valueAST.program.body[0].expression.properties
    const existingProps = node.properties
    for (const prop of props) {
      const isUndefinedProp = prop.value.type === 'Identifier' && prop.value.name === 'undefined'

      const existing = existingProps.findIndex(p => {
        return !p.computed && p.key.name === prop.key.name
      })
      if (existing > -1) {
        // replace
        if (replace) {
          existingProps[existing].value = prop.value
        } else {
          merge(existingProps[existing], prop)
        }

        // remove `undefined` props
        if (isUndefinedProp) {
          existingProps.splice(existing, 1)
        }
      } else if (!isUndefinedProp) {
        // append
        existingProps.push(prop)
      }
    }
  }

  return recast.print(ast).code
}
