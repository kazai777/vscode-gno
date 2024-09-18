package lsp

import (
	"context"
	"encoding/json"
	"log"
	"log/slog"
	"os"
	"path/filepath"

	"go.lsp.dev/jsonrpc2"
	"go.lsp.dev/protocol"

	"github.com/gnolang/gnopls/internal/env"
	"github.com/gnolang/gnopls/internal/tools"
	"github.com/gnolang/gnopls/internal/version"
)

type server struct {
	conn jsonrpc2.Conn
	env  *env.Env

	snapshot        *Snapshot
	completionStore *CompletionStore
	cache           *Cache

	formatOpt tools.FormattingOption
}

func BuildServerHandler(conn jsonrpc2.Conn, e *env.Env) jsonrpc2.Handler {
	dirs := []string{}

	execPath, err := os.Executable()
	if err != nil {
		log.Fatal(err)
	}

	execDir := filepath.Dir(execPath)

	projectRoot := filepath.Dir(execDir)
	slog.Info("projectroot")
	slog.Info(projectRoot)

	dirs = append(dirs, filepath.Join(projectRoot, "gno_functions", "examples"))
	dirs = append(dirs, filepath.Join(projectRoot, "gno_functions", "gnovm", "stdlibs"))
	server := &server{
		conn: conn,

		env: e,

		snapshot:        NewSnapshot(),
		completionStore: InitCompletionStore(dirs),
		cache:           NewCache(),

		formatOpt: tools.Gofumpt,
	}
	env.GlobalEnv = e
	return jsonrpc2.ReplyHandler(server.ServerHandler)
}

func (s *server) ServerHandler(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	switch req.Method() {
	case "exit":
		return s.Exit(ctx, reply, req)
	case "initialize":
		return s.Initialize(ctx, reply, req)
	case "initialized":
		return s.Initialized(ctx, reply, req)
	case "shutdown":
		return s.Shutdown(ctx, reply, req)
	case "textDocument/didChange":
		return s.DidChange(ctx, reply, req)
	case "textDocument/didClose":
		return s.DidClose(ctx, reply, req)
	case "textDocument/didOpen":
		return s.DidOpen(ctx, reply, req)
	case "textDocument/didSave":
		return s.DidSave(ctx, reply, req)
	case "textDocument/formatting":
		return s.Formatting(ctx, reply, req)
	case "textDocument/hover":
		return s.Hover(ctx, reply, req)
	case "textDocument/completion":
		return s.Completion(ctx, reply, req)
	case "textDocument/definition":
		return s.Definition(ctx, reply, req)
	default:
		return jsonrpc2.MethodNotFoundHandler(ctx, reply, req)
	}
}

func (s *server) Initialize(ctx context.Context, reply jsonrpc2.Replier, req jsonrpc2.Request) error {
	var params protocol.InitializeParams
	if err := json.Unmarshal(req.Params(), &params); err != nil {
		return sendParseError(ctx, reply, err)
	}

	return reply(ctx, protocol.InitializeResult{
		ServerInfo: &protocol.ServerInfo{
			Name:    "gnopls",
			Version: version.GetVersion(ctx),
		},
		Capabilities: protocol.ServerCapabilities{
			TextDocumentSync: protocol.TextDocumentSyncOptions{
				Change:    protocol.TextDocumentSyncKindFull,
				OpenClose: true,
				Save: &protocol.SaveOptions{
					IncludeText: true,
				},
			},
			CompletionProvider: &protocol.CompletionOptions{
				TriggerCharacters: []string{"."},
				ResolveProvider:   false,
			},
			HoverProvider: true,
			ExecuteCommandProvider: &protocol.ExecuteCommandOptions{
				Commands: []string{
					"gnopls.version",
				},
			},
			DefinitionProvider:         true,
			DocumentFormattingProvider: true,
		},
	}, nil)
}

func (s *server) Initialized(ctx context.Context, reply jsonrpc2.Replier, _ jsonrpc2.Request) error {
	slog.Info("initialized")
	return reply(ctx, nil, nil)
}

func (s *server) Shutdown(ctx context.Context, reply jsonrpc2.Replier, _ jsonrpc2.Request) error {
	slog.Info("shutdown")
	return reply(ctx, nil, s.conn.Close())
}

func (s *server) Exit(ctx context.Context, reply jsonrpc2.Replier, _ jsonrpc2.Request) error {
	slog.Info("exit")
	os.Exit(1)
	return nil
}
