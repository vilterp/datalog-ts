export type MessageToWebView = {
  type: "ContentsUpdated";
  text: string;
};

export type MessageFromWebView = {
  type: "ReadyForMessages";
};
