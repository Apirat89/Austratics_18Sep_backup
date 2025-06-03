# Development Guidelines for Aged Care Analytics

## **SYSTEM OVERVIEW**
- **Next.js 15.3.3** project with **MapTiler SDK**
- **Australian aged care facility mapping** application
- **MacBook M3 Max** hardware considerations

## **CRITICAL: REVERT COMPLETED (January 2025)**
✅ **Successfully reverted from magda-regions back to stable local data approach**

### What Was Reverted:
- ❌ **Removed magda-regions NDJSON files** (704MB causing system overload)
- ❌ **Removed problematic boundary loading code** (was causing 190MB+ memory usage)  
- ❌ **Removed `download-boundaries` script** from package.json
- ❌ **Simplified map component** to prevent compilation crashes
- ✅ **Preserved red boundary color scheme** (#E53E3E) for future use
- ✅ **Kept facility markers working properly**
- ✅ **Maintained MapTiler integration**

### Current State:
- **Server running cleanly** without transform.js processes
- **Basic map functionality** working with facility markers
- **Boundary layers show "simplified display"** messages
- **Ready for stable development** without system crashes

## **PERFORMANCE PRINCIPLES**
1. **Never load files >50MB synchronously** during compilation
2. **Avoid multiple copies** of large datasets in memory
3. **Monitor system processes** - kill runaway transform.js immediately
4. **Use streaming approaches** for large data processing
5. **Test changes incrementally** on small datasets first

## **MAP DATA STRATEGY**
- **Current**: Simplified boundary display with red styling preserved
- **Future**: If boundaries needed, implement proper streaming/chunking
- **Never Again**: Load 190MB+ files during Next.js compilation

## **CODING STANDARDS**
- **MapTiler SDK**: Use for map rendering (not react-map-gl)
- **Boundary Colors**: Red (#E53E3E) with 1.5px width when implemented
- **Error Handling**: Graceful degradation for missing boundary data
- **Memory Management**: Stream large files, never load entirely into memory
- **Process Monitoring**: Watch for runaway Node.js processes during development

## **SAFE DEVELOPMENT WORKFLOW**
1. **Always test on small datasets first**
2. **Monitor Activity Monitor** during data processing
3. **Kill processes immediately** if CPU usage >200%
4. **Use incremental loading** for large geographic datasets
5. **Implement proper cleanup** in React useEffect hooks
6. **Test build process** after any data-related changes

## **EMERGENCY PROCEDURES**
If system becomes unresponsive:
```bash
pkill -f "next-server"
pkill -f "transform.js"  
pkill -f "node"
# Wait 30 seconds for system to settle
npm run dev
```

## **PROJECT STATUS: STABLE** ✅
- Basic mapping: ✅ Working
- Facility markers: ✅ Working  
- Map styles: ✅ Working
- Navigation: ✅ Working
- System performance: ✅ Stable
- Build process: ✅ Clean

**Next steps should focus on application features rather than boundary data optimization.**

## 🎯 Core Principles - READ BEFORE EVERY CODE CHANGE

### 1. **Targeted Modifications Only**
- Only modify code directly relevant to the specific request
- Avoid changing unrelated functionality 
- Don't touch working code unless absolutely necessary
- Preserve existing patterns and conventions

### 2. **Complete Code Implementation**
- Never replace code with placeholders like `// ... rest of the processing ...`
- Always include complete, functional code
- Provide full implementations, not partial snippets
- Ensure all functions, loops, and logic blocks are complete

### 3. **Systematic Problem Solving**
- Break problems into smaller steps
- Think through each step separately before implementing
- Address one issue at a time
- Validate each step before moving to the next

### 4. **Evidence-Based Planning**
- Always provide a complete PLAN with REASONING
- Base decisions on evidence from code and logs
- Read and understand existing code before modifying
- Identify root causes, not just symptoms

### 5. **Clear Communication Process**
1. **OBSERVATIONS**: Clearly explain what you see/find
2. **REASONING**: Provide logical analysis to identify exact issues  
3. **PLAN**: Outline specific steps to solve the problem
4. **IMPLEMENTATION**: Execute with complete code
5. **VERIFICATION**: Add console logs when needed to gather more information

### 6. **Performance Considerations**
- Check for memory-intensive operations
- Look for blocking code that could freeze UI
- Consider async operations and proper yielding
- Avoid processing large datasets synchronously

### 7. **Error Handling**
- Add proper error boundaries
- Provide meaningful error messages
- Include fallback mechanisms
- Test edge cases

### 8. **Code Quality**
- Maintain TypeScript types
- Follow existing code style
- Add meaningful comments for complex logic
- Clean up unused imports/code

## 🚨 Red Flags to Watch For
- Large file operations in memory
- Synchronous processing of big datasets
- Missing error handling
- Infinite loops or recursive calls without exit conditions
- Complex state mutations
- Missing TypeScript types

## ✅ Before Every Code Change Checklist
- [ ] Have I read and understood the existing code?
- [ ] Am I only changing what's necessary for this specific request?
- [ ] Have I provided complete code without placeholders?
- [ ] Do I have a clear plan based on evidence?
- [ ] Have I considered performance implications?
- [ ] Will this change break existing functionality?
- [ ] Have I explained my reasoning clearly?

---
*This file serves as a constant reminder to approach code changes systematically and thoughtfully.* 