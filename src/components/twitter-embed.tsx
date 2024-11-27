import { useState } from 'react'
import { Linking, Pressable, StyleSheet, View } from 'react-native'
import WebView from 'react-native-webview'

function TweetEmbed({ tweetId }: { tweetId: string }) {
  const [height, setHeight] = useState(0)

  const embedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script async src="https://platform.twitter.com/widgets.js"></script>
      </head>
      <style>
        body {
          padding: 0;
          margin: 0;
        }
      </style>
      <body>
        <blockquote class="twitter-tweet">
          <a href="https://twitter.com/user/status/${tweetId}"></a>
        </blockquote>
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
        void Linking.openURL(`https://x.com/user/status/${tweetId}`)
      }}
    >
      <View style={[styles.container, { height }]} pointerEvents="none">
        <WebView
          originWhitelist={['*']}
          source={{ html: embedHtml }}
          injectedJavaScript={injectedJavaScript}
          onMessage={(event) => {
            setHeight(Number(event.nativeEvent.data))
          }}
          scrollEnabled={false}
        />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%' },
})

export { TweetEmbed }
