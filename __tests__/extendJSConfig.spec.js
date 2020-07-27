const extendJSConfig = require('../lib/extendJSConfig')

// 测试第三个参数为false，即使用合并策略
function mergeJSConfig(value, source) {
  return extendJSConfig(value, source, false).replace(/\r\n/g, '\n')
}

describe('测试覆盖', () => {
  test('如果目标属性是基础属性，则覆盖', () => {
    const newContent = mergeJSConfig(
      {
        title: 'new title',
      },
      `
        module.exports = {
          title: 'old title'
        }
      `,
    )
    expect(newContent).toBe(
      `
        module.exports = {
          title: 'new title'
        }
      `,
    )
  })
  test('如果目标属性不存在，则覆盖', () => {
    const newContent = mergeJSConfig(
      {
        title: 'new title',
      },
      `
        module.exports = {
          title: undefined
        }
      `,
    )
    expect(newContent).toBe(
      `
        module.exports = {
          title: 'new title'
        }
      `,
    )
  })
  test('如果目标属性是一个空函数，即没有参数也没有函数体，则覆盖', () => {
    const newContent = mergeJSConfig(
      {
        chainWebpack: config => {
          config.end()
        },
      },
      `
        module.exports = {
          chainWebpack: () => {}
        }
      `,
    )
    expect(newContent).toBe(
      `
        module.exports = {
          chainWebpack: config => {
            config.end();
          }
        }
      `,
    )
  })
})

describe('测试合并', () => {
  test('如果目标属性是一个有内容的函数，则合并', () => {
    const newContent = mergeJSConfig(
      {
        chainWebpack: config => {
          config.end()
        },
      },
      `
        module.exports = {
          chainWebpack: config => {
            config.plugins.delete('id')
          }
        }
      `,
    )
    expect(newContent).toBe(
      `
        module.exports = {
          chainWebpack: config => {
            config.plugins.delete('id')
            config.end();
          }
        }
      `,
    )
  })

  test('如果目标属性是一个对象，则合并', () => {
    const newContent = mergeJSConfig(
      {
        configureWebpack: {
          a: {
            b1: 'b1',
            b: {
              c: 'foo',
            },
          },
        },
      },
      `
        module.exports = {
          configureWebpack: {
            a: {
              b2: 'b2',
              b: {
                c: 'bar'
              }
            }
          }
        }
      `,
    )
    expect(newContent).toBe(
      `
        module.exports = {
          configureWebpack: {
            a: {
              b2: 'b2',

              b: {
                c: 'foo'
              },

              b1: 'b1'
            }
          }
        }
      `,
    )
  })

  test('如果对象是一个数组', () => {
    const newContent = mergeJSConfig(
      {
        files: ['a', 'b'],
      },
      `
        module.exports = {
          files: ['c']
        }
      `,
    )
    expect(newContent).toBe(
      `
        module.exports = {
          files: ['c', 'a', 'b']
        }
      `,
    )
  })
})
