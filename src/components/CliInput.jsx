import React, { useState, useRef, useEffect } from 'react';
import './CliInput.css';

const ROUTES = {
    home: '/',
    about: '/about',
    events: '/events',
    blog: '/blog',
    news: '/news',
    teams: '/teams',
    join: '/join',
    'paper-fund': '/paper-fund',
};

const COMMANDS = ['help', 'clear', 'pwd', 'ls', 'cd', ...Object.keys(ROUTES)];

const getParentPath = (path) => {
    if (path === '/') return '/';
    const parts = path.replace(/\/$/, '').split('/');
    parts.pop();
    return parts.join('/') || '/';
};

const CliInput = () => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const [currentPath, setCurrentPath] = useState('/');
    const historyRef = useRef(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        setCurrentPath(window.location.pathname);
    }, []);

    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [history]);

    const promptLabel = currentPath === '/' ? '~' : currentPath;

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const tokens = input.split(' ');
            const cmd = tokens[0];
            const arg = tokens.slice(1).join(' ');

            if (!input.includes(' ')) {
                // Completing a command name
                const matches = COMMANDS.filter(c => c.startsWith(input));
                if (matches.length === 1) {
                    const needsArg = matches[0] === 'cd';
                    setInput(matches[0] + (needsArg ? ' ' : ''));
                } else if (matches.length > 1) {
                    setHistory(prev => [...prev, `[user@quarcc ${promptLabel}]$ ${input}`, matches.join('    ')]);
                }
            } else if (cmd === 'cd') {
                // Completing a path argument for cd
                const routeNames = Object.keys(ROUTES);
                const matches = routeNames.filter(r => r.startsWith(arg));
                if (matches.length === 1) {
                    setInput(`cd ${matches[0]}`);
                } else if (matches.length > 1) {
                    setHistory(prev => [...prev, `[user@quarcc ${promptLabel}]$ ${input}`, matches.join('    ')]);
                }
            }
            return;
        }

        if (e.key === 'Enter') {
            const command = input.trim().toLowerCase();
            const newHistory = [...history, `[user@quarcc ${promptLabel}]$ ${input}`];

            if (command === 'help') {
                newHistory.push('Available commands:');
                newHistory.push('  home        - Go to Dashboard');
                newHistory.push('  about       - Club Information');
                newHistory.push('  events      - Upcoming Events');
                newHistory.push('  blog        - Blog / News');
                newHistory.push('  news        - Legacy blog redirect');
                newHistory.push('  teams       - Our Structure');
                newHistory.push('  join        - Recruitment');
                newHistory.push('  paper-fund  - Live Portfolios');
                newHistory.push('  clear       - Clear terminal');
                newHistory.push('  pwd         - Print current path');
                newHistory.push('  ls          - List available routes');
                newHistory.push('  cd <name>   - Navigate to a route');
            } else if (command === 'clear') {
                setHistory([]);
                setInput('');
                return;
            } else if (command === 'pwd') {
                newHistory.push(currentPath);
            } else if (command === 'ls') {
                newHistory.push(Object.keys(ROUTES).join('    '));
            } else if (command === 'cd' || command.startsWith('cd ')) {
                const arg = input.trim().slice(2).trim();
                let target;
                if (!arg || arg === '~' || arg === '/') {
                    target = '/';
                } else if (arg === '..') {
                    target = getParentPath(currentPath);
                } else if (ROUTES[arg]) {
                    target = ROUTES[arg];
                } else if (arg.startsWith('/')) {
                    newHistory.push(`bash: cd: ${arg}: No such file or directory`);
                    setHistory(newHistory);
                    setInput('');
                    return;
                } else {
                    newHistory.push(`bash: cd: ${arg}: No such file or directory`);
                    setHistory(newHistory);
                    setInput('');
                    return;
                }
                newHistory.push(`Navigating to ${target}...`);
                setHistory(newHistory);
                setInput('');
                window.location.assign(target);
                return;
            } else if (ROUTES[command]) {
                newHistory.push(`Navigating to ${command}...`);
                window.location.assign(ROUTES[command]);
            } else if (command !== '') {
                newHistory.push(`bash: ${command}: command not found`);
            }

            setHistory(newHistory);
            setInput('');
        }
    };

    return (
        <div className="cli-wrapper">
            <div className="cli-history" ref={historyRef}>
                {history.map((line, index) => (
                    <div key={index} className="cli-line">{line}</div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="cli-container">
                <span className="cli-prompt">[user@quarcc {promptLabel}]$</span>
                <input
                    type="text"
                    className="cli-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    placeholder="type help for a list of commands"
                />
            </div>
        </div>
    );
};

export default CliInput;
