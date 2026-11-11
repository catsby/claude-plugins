# Explain Code Plugin

Explains code using an analogy, an ASCII diagram, a step-by-step walkthrough, and a list of gotchas.

## Usage

The skill loads automatically when you ask how code works. To invoke it directly:

```
/explain-code:explain-code
```

Each explanation includes:

1. An everyday analogy for the core concept
2. An ASCII diagram (data flow, components, state transitions, or call hierarchy)
3. A walkthrough of entry points, transformations, exit conditions, and return values
4. Gotchas: common mistakes, edge cases, performance, and security

## Installation

```
/plugin install explain-code --marketplace catsby/claude-plugins
```
