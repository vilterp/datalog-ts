# SWI prolog
edge(a, b).
edge(b, c).
edge(c, d).
trans_edge(X, Z) :-
  edge(X, Z).
trans_edge(X, Z) :-
  edge(X, Y),
  trans_edge(Y, Z).
