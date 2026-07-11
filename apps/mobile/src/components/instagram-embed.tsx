import { useState } from 'react'
import { Linking, Pressable, StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

function InstagramEmbed({ postId }: { postId: string }) {
  const [height, setHeight] = useState(0)

  // TODO: figure out some way to force the embed to be respect the colorScheme,
  // currently it's shown in light mode regardless.

  const embedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script async="" src="https://www.instagram.com/embed.js"></script>
      </head>
      <style>
        body, html {
          padding: 0;
          margin: 0;
          background: transparent;
        }
        iframe {
          max-width: 100% !important;
          width: calc(100% - 2px) !important;
        }
      </style>
      <body>
        <blockquote
          class="instagram-media"
          data-instgrm-permalink="https://www.instagram.com/p/${postId}"
          ></blockquote>
      </body>
    </html>
  `

  const injectedJavaScript = `
    (() => {
      function updateHeight() {
        const height = document.documentElement.scrollHeight;
        window.ReactNativeWebView.postMessage(height);
      }

      const observer = new window.MutationObserver(updateHeight)
      observer.observe(document.documentElement, {
        subtree: true,
        attributes: true
      })
    })();
  `

  return (
    <Pressable
      onPress={() => {
        void Linking.openURL(`https://www.instagram.com/p/${postId}`)
      }}
    >
      <View style={[styles.container, { height }]} pointerEvents="none">
        <WebView
          source={{ html: embedHtml }}
          injectedJavaScript={injectedJavaScript}
          onMessage={(event) => {
            setHeight(Number(event.nativeEvent.data))
          }}
          scrollEnabled={false}
          style={{ backgroundColor: 'transparent' }}
        />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%' },
})

export { InstagramEmbed }
