import { expect, preferencesTestSet, loadBackground } from './setup';

preferencesTestSet.map((preferences) => {
  describe(`preferences: ${JSON.stringify(preferences)}`, () => {
    beforeEach(() => {
      // // eslint-disable-next-line require-atomic-updates
      // background.storage.local.preferences.isolation.global.mouseClick.middle.action =
      //   'always';
      // // eslint-disable-next-line require-atomic-updates
      // background.storage.local.preferences.isolation.global.mouseClick.ctrlleft.action =
      //   'always';
    });
    describe('preferences for global mouse clicks', () => {
      it('global middle mouse allowed by default', async () => {
        const { tmp: background, helper } = await loadBackground({
          preferences,
        });

        const fakeSender = {
          tab: helper.fakeTab({
            id: 1,
            url: 'https://notexample.com',
          }),
        };
        const fakeMessage = {
          method: 'linkClicked',
          payload: {
            href: 'https://example.com',
            event: {
              button: 1,
            },
          },
        };

        background.storage.local.preferences.isolation.global.mouseClick.middle.action =
          'always';
        await background.runtime.onMessage(fakeMessage, fakeSender);
        expect(background.mouseclick.isolated[fakeMessage.payload.href]).to
          .exist;
      });

      // it('global middle mouse same domain (ignore)', async () => {
      //   const { tmp: background, helper } = await loadBackground({
      //     preferences,
      //   });
      //
      //   const fakeSender = {
      //     tab: helper.fakeTab({
      //       id: 1,
      //       url: 'https://notexample.com',
      //     }),
      //   };
      //   const fakeMessage = {
      //     method: 'linkClicked',
      //     payload: {
      //       href: 'https://example.com',
      //       event: {
      //         button: 1,
      //       },
      //     },
      //   };
      //
      //   background.storage.local.preferences.isolation.global.mouseClick.middle.action =
      //     'notsamedomain';
      //   await background.runtime.onMessage(fakeMessage, fakeSender);
      //   expect(background.mouseclick.isolated[fakeMessage.payload.href]).not.to
      //     .be.undefined;
      // });
      //
      // it('global middle mouse same domain (handle)', async () => {
      //   const { tmp: background, helper } = await loadBackground({
      //     preferences,
      //   });
      //
      //   const fakeSender = {
      //     tab: helper.fakeTab({
      //       id: 1,
      //       url: 'https://example.com',
      //     }),
      //   };
      //   const fakeMessage = {
      //     method: 'linkClicked',
      //     payload: {
      //       href: 'https://not.example.com',
      //       event: {
      //         button: 1,
      //       },
      //     },
      //   };
      //   background.storage.local.preferences.isolation.global.mouseClick.middle.action =
      //     'notsamedomain';
      //   await background.runtime.onMessage(fakeMessage, fakeSender);
      //   expect(background.mouseclick.isolated[fakeMessage.payload.href]).to.be
      //     .undefined;
      // });
      //
      // it('global middle mouse exact same domain (fail)', async () => {
      //   const { tmp: background, helper } = await loadBackground({
      //     preferences,
      //   });
      //
      //   const fakeSender = {
      //     tab: helper.fakeTab({
      //       id: 1,
      //       url: 'https://not.example.com',
      //     }),
      //   };
      //   const fakeMessage = {
      //     method: 'linkClicked',
      //     payload: {
      //       href: 'https://example.com',
      //       event: {
      //         button: 1,
      //       },
      //     },
      //   };
      //
      //   background.storage.local.preferences.isolation.global.mouseClick.middle.action =
      //     'notsamedomainexact';
      //   await background.runtime.onMessage(fakeMessage, fakeSender);
      //   expect(background.mouseclick.isolated[fakeMessage.payload.href]).not.to
      //     .be.undefined;
      // });
      //
      // it('global middle mouse exact same domain (handle)', async () => {
      //   const { tmp: background, helper } = await loadBackground({
      //     preferences,
      //   });
      //
      //   const fakeSender = {
      //     tab: helper.fakeTab({
      //       id: 1,
      //       url: 'https://example.com',
      //     }),
      //   };
      //   const fakeMessage = {
      //     method: 'linkClicked',
      //     payload: {
      //       href: 'https://example.com/whatever',
      //       event: {
      //         button: 1,
      //       },
      //     },
      //   };
      //
      //   background.storage.local.preferences.isolation.global.mouseClick.middle.action =
      //     'notsamedomainexact';
      //   await background.runtime.onMessage(fakeMessage, fakeSender);
      //   expect(background.mouseclick.isolated[fakeMessage.payload.href]).to.be
      //     .undefined;
      // });

      it('global ctrl+left mouse allowed', async () => {
        const { tmp: background, helper } = await loadBackground({
          preferences,
        });

        const fakeSender = {
          tab: helper.fakeTab({
            id: 1,
            url: 'https://notexample.com',
          }),
        };
        const fakeMessage = {
          method: 'linkClicked',
          payload: {
            href: 'https://example.com',
            event: {
              button: 0,
              ctrlKey: true,
            },
          },
        };

        background.storage.local.preferences.isolation.global.mouseClick.ctrlleft.action =
          'always';
        await background.runtime.onMessage(fakeMessage, fakeSender);
        expect(background.mouseclick.isolated[fakeMessage.payload.href]).not.to
          .be.undefined;
      });

      it('global meta+left mouse allowed', async () => {
        const { tmp: background, helper } = await loadBackground({
          preferences,
        });

        const fakeSender = {
          tab: helper.fakeTab({
            id: 1,
            url: 'https://notexample.com',
          }),
        };
        const fakeMessage = {
          method: 'linkClicked',
          payload: {
            href: 'https://example.com',
            event: {
              button: 0,
              metaKey: true,
            },
          },
        };

        background.storage.local.preferences.isolation.global.mouseClick.ctrlleft.action =
          'always';
        await background.runtime.onMessage(fakeMessage, fakeSender);
        expect(background.mouseclick.isolated[fakeMessage.payload.href]).not.to
          .be.undefined;
      });

      //   it('global ctrl+left mouse same domain (ignore)', async () => {
      //     const { tmp: background, helper } = await loadBackground({
      //       preferences,
      //     });
      //
      //     const fakeSender = {
      //       tab: helper.fakeTab({
      //         id: 1,
      //         url: 'https://notexample.com',
      //       }),
      //     };
      //     const fakeMessage = {
      //       method: 'linkClicked',
      //       payload: {
      //         href: 'https://example.com',
      //         event: {
      //           button: 0,
      //           ctrlKey: true,
      //         },
      //       },
      //     };
      //
      //     background.storage.local.preferences.isolation.global.mouseClick.ctrlleft.action =
      //       'notsamedomain';
      //     await background.runtime.onMessage(fakeMessage, fakeSender);
      //     expect(background.mouseclick.isolated[fakeMessage.payload.href]).not.to
      //       .be.undefined;
      //   });
      //
      //   it('global ctrl+left mouse same domain (handle)', async () => {
      //     const { tmp: background, helper } = await loadBackground({
      //       preferences,
      //     });
      //
      //     const fakeSender = {
      //       tab: helper.fakeTab({
      //         id: 1,
      //         url: 'https://not.example.com',
      //       }),
      //     };
      //     const fakeMessage = {
      //       method: 'linkClicked',
      //       payload: {
      //         href: 'https://example.com',
      //         event: {
      //           button: 0,
      //           ctrlKey: true,
      //         },
      //       },
      //     };
      //
      //     background.storage.local.preferences.isolation.global.mouseClick.ctrlleft.action =
      //       'notsamedomain';
      //     await background.runtime.onMessage(fakeMessage, fakeSender);
      //     expect(background.mouseclick.isolated[fakeMessage.payload.href]).to.be
      //       .undefined;
      //   });
      //
      //   it('global ctrl+left mouse exact same domain (fail)', async () => {
      //     const { tmp: background, helper } = await loadBackground({
      //       preferences,
      //     });
      //
      //     const fakeSender = {
      //       tab: helper.fakeTab({
      //         id: 1,
      //         url: 'https://not.example.com',
      //       }),
      //     };
      //     const fakeMessage = {
      //       method: 'linkClicked',
      //       payload: {
      //         href: 'https://example.com',
      //         event: {
      //           button: 0,
      //           ctrlKey: true,
      //         },
      //       },
      //     };
      //
      //     background.storage.local.preferences.isolation.global.mouseClick.ctrlleft.action =
      //       'notsamedomainexact';
      //     await background.runtime.onMessage(fakeMessage, fakeSender);
      //     expect(background.mouseclick.isolated[fakeMessage.payload.href]).not.to
      //       .be.undefined;
      //   });
      //
      //   it('global ctrl+left mouse exact same domain (handle)', async () => {
      //     const { tmp: background, helper } = await loadBackground({
      //       preferences,
      //     });
      //
      //     const fakeSender = {
      //       tab: helper.fakeTab({
      //         id: 1,
      //         url: 'https://example.com',
      //       }),
      //     };
      //     const fakeMessage = {
      //       method: 'linkClicked',
      //       payload: {
      //         href: 'https://example.com/whatever',
      //         event: {
      //           button: 0,
      //           ctrlKey: true,
      //         },
      //       },
      //     };
      //
      //     background.storage.local.preferences.isolation.global.mouseClick.ctrlleft.action =
      //       'notsamedomainexact';
      //     await background.runtime.onMessage(fakeMessage, fakeSender);
      //     expect(background.mouseclick.isolated[fakeMessage.payload.href]).to.be
      //       .undefined;
      //   });
    });

    describe('preferences for mouse clicks per domain', () => {
      it('middle mouse per domain: never', async () => {
        const { tmp: background, helper } = await loadBackground({
          preferences,
        });

        const fakeSender = {
          tab: helper.fakeTab({
            id: 1,
            url: 'https://example.com',
          }),
        };
        const fakeMessage = {
          method: 'linkClicked',
          payload: {
            href: 'https://not.example.com',
            event: {
              button: 1,
            },
          },
        };

        background.storage.local.preferences.isolation.domain = [
          {
            ...background.preferences.defaults.isolation.global,
            targetPattern: 'example.com',
            mouseClick: {
              ...background.preferences.defaults.isolation.global.mouseClick,
              middle: {
                action: 'never',
                container: 'default',
              },
            },
            always: {
              action: 'disabled',
              allowedInPermanent: true,
              allowedInTemporary: true,
            },
          },
        ];
        await background.runtime.onMessage(fakeMessage, fakeSender);
        expect(background.mouseclick.isolated[fakeMessage.payload.href]).to.be
          .undefined;
      });

      // it('middle mouse per domain: notsamedomainexact (handle)', async () => {
      //   const { tmp: background, helper } = await loadBackground({
      //     preferences,
      //   });
      //
      //   const fakeSender = {
      //     tab: helper.fakeTab({
      //       id: 1,
      //       url: 'https://example.com',
      //     }),
      //   };
      //   const fakeMessage = {
      //     method: 'linkClicked',
      //     payload: {
      //       href: 'https://not.example.com',
      //       event: {
      //         button: 1,
      //       },
      //     },
      //   };
      //
      //   background.storage.local.preferences.isolation.domain = [
      //     {
      //       ...background.preferences.defaults.isolation.global,
      //       targetPattern: 'example.com',
      //       mouseClick: {
      //         ...background.preferences.defaults.isolation.global.mouseClick,
      //         middle: {
      //           action: 'notsamedomainexact',
      //           container: 'default',
      //         },
      //       },
      //       always: {
      //         action: 'disabled',
      //         allowedInPermanent: true,
      //         allowedInTemporary: true,
      //       },
      //     },
      //   ];
      //   await background.runtime.onMessage(fakeMessage, fakeSender);
      //   expect(background.mouseclick.isolated[fakeMessage.payload.href]).not.to
      //     .be.undefined;
      // });
      //
      // it('middle mouse per domain: notsamedomainexact (ignore)', async () => {
      //   const { tmp: background, helper } = await loadBackground({
      //     preferences,
      //   });
      //
      //   const fakeSender = {
      //     tab: helper.fakeTab({
      //       id: 1,
      //       url: 'https://example.com',
      //     }),
      //   };
      //   const fakeMessage = {
      //     method: 'linkClicked',
      //     payload: {
      //       href: 'https://example.com/whatever',
      //       event: {
      //         button: 1,
      //       },
      //     },
      //   };
      //
      //   background.storage.local.preferences.isolation.domain = [
      //     {
      //       ...background.preferences.defaults.isolation.global,
      //       targetPattern: 'example.com',
      //       mouseClick: {
      //         ...background.preferences.defaults.isolation.global.mouseClick,
      //         middle: {
      //           action: 'notsamedomainexact',
      //           container: 'default',
      //         },
      //       },
      //       always: {
      //         action: 'disabled',
      //         allowedInPermanent: true,
      //         allowedInTemporary: true,
      //       },
      //     },
      //   ];
      //   await background.runtime.onMessage(fakeMessage, fakeSender);
      //   expect(background.mouseclick.isolated[fakeMessage.payload.href]).to.be
      //     .undefined;
      // });
      //
      // it('middle mouse per domain: notsamedomain (handle)', async () => {
      //   const { tmp: background, helper } = await loadBackground({
      //     preferences,
      //   });
      //
      //   const fakeSender = {
      //     tab: helper.fakeTab({
      //       id: 1,
      //       url: 'https://example.com',
      //     }),
      //   };
      //   const fakeMessage = {
      //     method: 'linkClicked',
      //     payload: {
      //       href: 'https://not.example.com',
      //       event: {
      //         button: 1,
      //       },
      //     },
      //   };
      //
      //   background.storage.local.preferences.isolation.domain = [
      //     {
      //       ...background.preferences.defaults.isolation.global,
      //       targetPattern: 'example.com',
      //       mouseClick: {
      //         ...background.preferences.defaults.isolation.global.mouseClick,
      //         middle: {
      //           action: 'notsamedomain',
      //           container: 'default',
      //         },
      //       },
      //       always: {
      //         action: 'disabled',
      //         allowedInPermanent: true,
      //         allowedInTemporary: true,
      //       },
      //     },
      //   ];
      //   await background.runtime.onMessage(fakeMessage, fakeSender);
      //   expect(background.mouseclick.isolated[fakeMessage.payload.href]).to.be
      //     .undefined;
      // });
      //
      // it('middle mouse per domain: notsamedomain (handle)', async () => {
      //   const { tmp: background, helper } = await loadBackground({
      //     preferences,
      //   });
      //
      //   const fakeSender = {
      //     tab: helper.fakeTab({
      //       id: 1,
      //       url: 'https://example.com',
      //     }),
      //   };
      //   const fakeMessage = {
      //     method: 'linkClicked',
      //     payload: {
      //       href: 'https://notexample.com',
      //       event: {
      //         button: 1,
      //       },
      //     },
      //   };
      //
      //   background.storage.local.preferences.isolation.domain = [
      //     {
      //       ...background.preferences.defaults.isolation.global,
      //       targetPattern: 'example.com',
      //       mouseClick: {
      //         ...background.preferences.defaults.isolation.global.mouseClick,
      //         middle: {
      //           action: 'notsamedomain',
      //           container: 'default',
      //         },
      //       },
      //       always: {
      //         action: 'disabled',
      //         allowedInPermanent: true,
      //         allowedInTemporary: true,
      //       },
      //     },
      //   ];
      //   await background.runtime.onMessage(fakeMessage, fakeSender);
      //   expect(background.mouseclick.isolated[fakeMessage.payload.href]).not.to
      //     .be.undefined;
      // });

      it('per domain should only handle the relevant domain (exact)', async () => {
        const { tmp: background, helper } = await loadBackground({
          preferences,
        });

        const fakeSender = {
          tab: helper.fakeTab({
            id: 1,
            url: 'https://example.com',
          }),
        };
        const fakeMessage = {
          method: 'linkClicked',
          payload: {
            href: 'https://notexample.com',
            event: {
              button: 1,
            },
          },
        };

        background.storage.local.preferences.isolation.global.mouseClick.middle.action =
          'never';
        background.storage.local.preferences.isolation.domain = [
          {
            ...background.preferences.defaults.isolation.global,
            targetPattern: 'whynotexample.com',
            mouseClick: {
              ...background.preferences.defaults.isolation.global.mouseClick,
              middle: {
                action: 'always',
                container: 'default',
              },
            },
            always: {
              action: 'disabled',
              allowedInPermanent: true,
              allowedInTemporary: true,
            },
          },
        ];
        await background.runtime.onMessage(fakeMessage, fakeSender);
        expect(background.mouseclick.isolated[fakeMessage.payload.href]).to.be
          .undefined;
      });

      it('per domain should overwrite global', async () => {
        const { tmp: background, helper } = await loadBackground({
          preferences,
        });

        const fakeSender = {
          tab: helper.fakeTab({
            id: 1,
            url: 'https://example.com',
          }),
        };
        const fakeMessage = {
          method: 'linkClicked',
          payload: {
            href: 'https://notexample.com',
            event: {
              button: 1,
            },
          },
        };

        background.storage.local.preferences.isolation.global.mouseClick.middle.action =
          'never';
        background.storage.local.preferences.isolation.domain = [
          {
            ...background.preferences.defaults.isolation.global,
            targetPattern: 'example.com',
            mouseClick: {
              ...background.preferences.defaults.isolation.global.mouseClick,
              middle: {
                action: 'always',
                container: 'default',
              },
            },
            always: {
              action: 'disabled',
              allowedInPermanent: true,
              allowedInTemporary: true,
            },
          },
        ];
        await background.runtime.onMessage(fakeMessage, fakeSender);
        expect(background.mouseclick.isolated[fakeMessage.payload.href]).not.to
          .be.undefined;
      });

      it('per domain should handle the relevant domain (glob)', async () => {
        const { tmp: background, helper } = await loadBackground({
          preferences,
        });

        const fakeSender = {
          tab: helper.fakeTab({
            id: 1,
            url: 'https://www.example.com',
          }),
        };
        const fakeMessage = {
          method: 'linkClicked',
          payload: {
            href: 'https://not.example.com',
            event: {
              button: 1,
            },
          },
        };

        background.storage.local.preferences.isolation.domain = [
          {
            ...background.preferences.defaults.isolation.global,
            targetPattern: '*.example.com',
            mouseClick: {
              ...background.preferences.defaults.isolation.global.mouseClick,
              middle: {
                action: 'never',
                container: 'default',
              },
            },
            always: {
              action: 'disabled',
              allowedInPermanent: true,
              allowedInTemporary: true,
            },
          },
        ];
        await background.runtime.onMessage(fakeMessage, fakeSender);
        expect(background.mouseclick.isolated[fakeMessage.payload.href]).to.be
          .undefined;
      });
    });
  });
});
